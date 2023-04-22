using ModelingToolkit, DifferentialEquations, LinearAlgebra, IfElse, UUIDs, Distributions, Makie, WGLMakie
using Symbolics: scalarize
includet("quaternion.jl")

WGLMakie.activate!()

@variables t
D = Differential(t)

"""
    Component
...
# Abstract type for defining spacecraft components
...
"""
abstract type Component end


"""
    Body
...
# Arguments
- `J::Matrix{Float64,3,3}`: Inertia tensor (J to not conflict with identity matrix function).
- `Φ0::Vector{Float64,3}`: Initial euler angles
- `ω0::Vector{Float64,3}`: Initial angular velocity
...
"""
Base.@kwdef mutable struct Body <: Component
    name::Symbol
    J::Matrix{Float64}
    q::Vector{Float64}
    ω::Vector{Float64}
    r::Vector{Float64}
    v::Vector{Float64}
    sys::Union{ODESystem,Nothing} = nothing
end

function make(C::Body)
    @variables Φ(t)[1:3] = zeros(3) [irreducible = true]#angles
    @variables q(t)[1:4] = C.q #quaternion
    @variables ω(t)[1:3] = C.ω #rates    
    @variables Hb(t)[1:3] = C.J * C.ω #body momentum
    @variables Hi(t)[1:3] = zeros(3)#internal momentum 
    @variables Hs(t)[1:3] = zeros(3) #system momentum
    @variables T(t)[1:3] = zeros(3)#torque
    @variables r(t)[1:3] = C.r
    @variables v(t)[1:3] = C.v
    @variables g(t)[1:3] = zeros(3)

    @parameters J[1:3, 1:3] = C.J #inertia

    Q = [
        q[4] -q[3] q[2]
        q[3] q[4] -q[1]
        -q[2] q[1] q[4]
        -q[1] -q[2] -q[3]
    ]

    #note: DAE form used so we can solve the unsimplified system
    eqs = [
        zeros(3) .~ ω - inv(scalarize(J)) * Hb
        zeros(3) .~ Φ - qtoe(q)
        zeros(3) .~ Hs - (Hb + Hi)
        D.(q) .~ 0.5 * Q * ω
        D.(Hb) .~ T - cross(ω, Hs)
        D.(r) .~ v
        D.(v) .~ g #+F from externals when you can
    ]
    C.sys = ODESystem(eqs, t, name=C.name)
    return C.sys
end

"""
    Thruster
...
# Arguments
- `F::Float64`: Thruster force magnitude
- `r::Vector{Float64,3}`: Position vector to thruster in parent frame
- `R::Vector{Float64,3,3}`: Thruster line of action rotation in parent frame
...
"""
Base.@kwdef mutable struct Thruster <: Component
    name::Symbol
    F::Float64
    r::Vector{Float64}
    R::Matrix{Float64}
    sys::Union{ODESystem,Nothing} = nothing
end
function make(C::Thruster)
    @variables u(t) = 1
    @variables T(t)[1:3] = zeros(3)

    @parameters F = C.F
    @parameters r[1:3] = C.r
    @parameters R[1:3, 1:3] = C.R

    F̄ = [0, 0, F]#assumed out thruster +z-axis
    eqs = zeros(3) .~ T - u * (r × (scalarize(R) * F̄))

    C.sys = ODESystem(eqs, t, name=C.name)
    return C.sys
end

"""
    ReactionWheel
...
# Arguments
- `J::Float64`: Inertia moment of inertia (J to not conflict with identity matrix function).
- `kt::Float64`: Motor constant
- `ω::Float64`: Initial wheel angular velocity
...
"""
Base.@kwdef mutable struct ReactionWheel <: Component
    name::Symbol
    J::Float64
    kt::Float64
    a::Vector{Float64}
    ω::Float64
    sys::Union{ODESystem,Nothing} = nothing
end

function make(C::ReactionWheel)

    @variables u(t) = 0#input current command
    @variables Tm(t) = 0 #wheel torque in wheel frame
    @variables T(t)[1:3] = zeros(3)#wheel reaction torque in body frame
    @variables H(t)[1:3] = zeros(3)#output internal momentum
    @variables ω(t) = C.ω #wheel speed

    @parameters a[1:3] = normalize(C.a) #axis of rotation
    @parameters kt = C.kt #current to torque motor gain
    @parameters J = C.J #wheel inertia    

    eqs = [
        0 ~ Tm - kt * u
        D.(ω) .~ Tm ./ J
        zeros(3) .~ T - Tm * a
        zeros(3) .~ H - J * ω * a
    ]
    C.sys = ODESystem(eqs, t, name=C.name)
    return C.sys
end

"""
    RateGyro
...
# Arguments
- `σ::Float64`: RateGyro random noise generator power level
...
"""
Base.@kwdef mutable struct RateGyro <: Component
    name::Symbol
    σ::Float64 # noise power
    sys::Union{ODESystem,Nothing} = nothing
    #r::Vector{Float64} # position vector to rategyro in body frame, used to induce wxr errors (to be added)
end

function make(C::RateGyro)
    @variables ω_truth(t)[1:3] = zeros(3)
    @variables ω_sensed(t)[1:3] = zeros(3) [irreducible = true]

    eqs = zeros(3) .~ ω_sensed - ω_truth # noise added through SDE

    C.sys = ODESystem(eqs, t, name=C.name)
    return C.sys
end

"""
    Controller
...
# Arguments
This is just a FSW controller interface. The equations should set the FSW states to constant (D.(x) .~ 0)
Value of the controller should be set by callback in the ODEProblem
...
"""

Base.@kwdef mutable struct Controller <: Component
    name::Symbol
    sys::Union{ODESystem,Nothing} = nothing
end

function make(C::Controller)
    @variables rw_commands(t)[1:3] = zeros(3)
    @variables thruster_commands(t)[1:4] = zeros(4)

    eqs = [
        D.(rw_commands) .~ zeros(3)
        D.(thruster_commands) .~ zeros(4)
    ]

    C.sys = ODESystem(eqs, t, name=C.name)
    return C.sys
end


abstract type Gravity end
"""
    TwoBody
...
# Arguments
Can specify mu or R if needed but defaults to Vallado Earth with no input
...
"""
Base.@kwdef mutable struct TwoBody <: Gravity
    name::Symbol = :TwoBody
    μ::Float64 = 3.986004415e14
    R::Float64 = 6378136.3
    sys::Union{ODESystem,Nothing} = nothing
end

function make(C::TwoBody)
    @variables    r(t)[1:3] = ones(3) [input = true] #dont make zeros or instability
    @variables    g(t)[1:3] = zeros(3) [output = true]

    @parameters μ = C.μ

    rmag = sqrt(dot(r,r))

    eqs = zeros(3) .~ g - (-μ*r/norm(r)^3)

    C.sys = ODESystem(scalarize(eqs), t, name=C.name)
    return C.sys
    
end

"""
    Spacecraft
...
# Arguments
- `Components::Vector{Component}`: Vector of abstract components 
...
"""
Base.@kwdef mutable struct Spacecraft
    name::Symbol
    body::Body
    thrusters::Union{Vector{Thruster},Nothing} = nothing
    reactionwheels::Union{Vector{ReactionWheel},Nothing} = nothing
    iru::RateGyro
    controller::Controller
    gravity::Gravity
    full_sys::Union{ODESystem,Nothing} = nothing
    sys::Union{ODESystem,Nothing} = nothing #structural_simplify'd sys
end


function make!(C::Spacecraft)
    body = make(C.body)
    thrusters = make.(C.thrusters)
    reactionwheels = make.(C.reactionwheels)
    rategyro = make(C.iru)
    controller = make(C.controller)
    gravity = make(C.gravity)

    eqs = [
        zeros(3) .~ body.T - (sum(map(x -> x.T, thrusters)) - sum(map(x -> x.T, reactionwheels)))
        zeros(3) .~ body.Hi - sum(map(x -> x.H, reactionwheels))
        zeros(3) .~ rategyro.ω_truth - body.ω
        zeros(length(reactionwheels)) .~ controller.rw_commands - map(x -> x.u, reactionwheels)
        zeros(length(thrusters)) .~ controller.thruster_commands - map(x -> x.u, thrusters)
        zeros(3) .~ body.r - gravity.r
        zeros(3) .~ body.g - gravity.g
    ]

    C.full_sys = compose(ODESystem([eqs...;], t, name=C.name), body, thrusters..., reactionwheels..., rategyro, controller,gravity)
    C.sys = structural_simplify(C.full_sys)
end


function test(sys)
    prob = ODEProblem(sys, [Disp], (0.0, 100.0))
    solve(prob, Rodas4(), dt=0.1, adaptive=false, progress=true)
end

indexof(sym, syms) = findfirst(isequal(sym), syms)

function simulate(sc, tspan; dispersions=[], nruns=1)

    i_Φ = [
        indexof(Symbol("getindex(body₊Φ(t), 1)"), Symbol.(states(sc.sys))),
        indexof(Symbol("getindex(body₊Φ(t), 2)"), Symbol.(states(sc.sys))),
        indexof(Symbol("getindex(body₊Φ(t), 3)"), Symbol.(states(sc.sys))),
    ]
    i_ω = [
        indexof(Symbol("getindex(iru₊ω_sensed(t), 1)"), Symbol.(states(sc.sys))),
        indexof(Symbol("getindex(iru₊ω_sensed(t), 2)"), Symbol.(states(sc.sys))),
        indexof(Symbol("getindex(iru₊ω_sensed(t), 3)"), Symbol.(states(sc.sys)))
    ]

    i_rw = [
        indexof(Symbol("getindex(controller₊rw_commands(t), 1)"), Symbol.(states(sc.sys))),
        indexof(Symbol("getindex(controller₊rw_commands(t), 2)"), Symbol.(states(sc.sys))),
        indexof(Symbol("getindex(controller₊rw_commands(t), 3)"), Symbol.(states(sc.sys))),
    ]

    """ FSW Callback """
    function fsw!(integrator)

        #DI
        ω = @view integrator.u[i_ω]
        Φ = @view integrator.u[i_Φ]

        #AC
        Φr = [pi / 2, 0, 0]
        ωr = [0, 0, 0]
        kp = 10
        kd = 1000

        rw_u = -kp * (Φr - Φ) - kd * (ωr - ω)

        #DO
        integrator.u[i_rw] .= rw_u
    end

    model_cb = PeriodicCallback(fsw!, 0.1, save_positions=(false, false))

    prob = ODEProblem(sc.sys, [], tspan, callback=model_cb)
    sol = solve(prob, Rodas4(), progress=true)

    # monte carlo


    if nruns > 1
        # draw dispersions
        dispersion_keys = keys(dispersions)
        dispersion_values = rand.(getindex.(Ref(dispersions), dispersion_keys), nruns)

        # update problem
        function prob_func(prob, i, repeat)
            print("Simulating run $i\n")
            these_dispersions = Dict(dispersion_keys .=> map(x -> x[i], dispersion_values))

            prob = remake(prob,
                u0 = update_u0(these_dispersions, sc.sys),
                p = update_p(these_dispersions, sc.sys)
            )
        end
        eprob = EnsembleProblem(prob, prob_func=prob_func)
        sim = solve(eprob, trajectories=nruns)
    else
        sim = nothing
    end
    (sol,sim)
end

function plot3(d::Vector{Vector{Float64}})
    n = length(d[1])
    f = lines(map(x -> x[1], d))
    if n > 1
        for i = 2:n
            lines!(map(x -> x[i], d))
        end
    end
    return f
end

function mcplot(f,sol::ODESolution,sims::EnsembleSolution,index = nothing)
    !isnothing(index) ? f2 = x -> map(y->y[index],f(x)) : f2 = x -> f(x)
    
    fig = Figure()
    ax = Axis(fig[1,1])
    for sim in sims
        lines!(ax,sim.t,f2(sim),color = (:gray, 0.2),linewidth = 3)
    end
    lines!(ax,sol.t,f2(sol),color = :red, linewidth = 3)
    fig
end

includet("animators.jl")

function update_u0(x_updates, sys)
    defs = ModelingToolkit.get_defaults(sys)
    x = states(sys)
    def_x_values = [defs[i] for i in x]
    def_x = Dict(x .=> def_x_values)
    new_x = merge(def_x, x_updates)
    ModelingToolkit.varmap_to_vars(new_x, x)
end
function update_p(p_updates, sys)
    defs = ModelingToolkit.get_defaults(sys)
    p = parameters(sys)
    def_p_values = [defs[i] for i in p]
    def_p = Dict(p .=> def_p_values)
    new_p = merge(def_p, p_updates)
    ModelingToolkit.varmap_to_vars(new_p, p)
end