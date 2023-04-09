
includet("jsat.jl")

sc = Spacecraft(
    name=:sc,
    body=Body(
        name=:body,
        J=1000 * I(3),
        q=[0, 0, 0, 1],
        ω=zeros(3)
    ),
    thrusters=[
        Thruster(
            name=:thr1,
            F=1,
            r=[1, 0, -1],
            R=[0 1 0; 1 0 0; 0 0 1]
        ),
        Thruster(
            name=:thr2,
            F=1,
            r=[-1, 0, -1],
            R=[0 1 0; 1 0 0; 0 0 1]
        ),
        Thruster(
            name=:thr3,
            F=1,
            r=[0, 1, -1],
            R=[0 1 0; 1 0 0; 0 0 1]
        ),
        Thruster(
            name=:thr4,
            F=1,
            r=[0, -1, -1],
            R=[0 1 0; 1 0 0; 0 0 1]
        ),
    ],
    reactionwheels=[
        ReactionWheel(
            name=:rw1,
            J=0.25,
            kt=0.075,
            a=[1, 0, 0],
            ω=0
        ),
        ReactionWheel(
            name=:rw2,
            J=0.25,
            kt=0.075,
            a=[0, 1, 0],
            ω=0),
        ReactionWheel(
            name=:rw3, 
            J=0.25,
            kt=0.075,
            a=[0, 0, 1],
            ω=0),
    ],
    iru=RateGyro(
        name=:iru,
        σ=0.01
    ),
    controller=Controller(
        name=:controller
    )
)

make!(sc)

dispersions = Dict(
    scalarize(sc.body.sys.Hb) .=> Normal.(zeros(3), sc.body.J * [0.01, 0.01, 0.01] / 3)
)

sol, sim = simulate(sc, (0, 500), dispersions=dispersions, nruns=30);

#animate_sc(sc,sol)