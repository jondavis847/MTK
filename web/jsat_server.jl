using HTTP.WebSockets, JSON, Revise, StructTypes
includet("..\\test.jl")

function dict_to_json(d)
   io = IOBuffer()
   JSON.print(io, d)
   String(take!(io))
end

function to_console(msg)
   d = Dict("type" => "console", "data" => msg)
   dict_to_json(d)
end

function to_data(data)
   d = Dict("type" => "data", "data" => data)
   dict_to_json(d)
end

function to_states(x)
   d = Dict("type" => "states", "data" => string.(keys(x)))
   dict_to_json(d)
end

function jsat_server()
   # server  
   WebSockets.listen("127.0.0.1", 8081) do ws
      x = Dict()
      sol = nothing #for scope
      println("Client Connected")
      # iterate incoming websocket messages      
      for msg in ws
         julia_msg = JSON.parse(msg)
         println(julia_msg)

         # send message back to client or do other logic here         
         if julia_msg["type"] == "simulate"
            send(ws, to_console("simulating..."))
            scdict = julia_msg["data"]["sc"]
            sc = dict_to_spacecraft(scdict)
            println(sc)
            make!(sc)

            simdict = julia_msg["data"]["sim"]
            println(simdict)
            sim = dict_to_sim(simdict)
            println(sim)
            t = time()
            sol, ens = simulate(sc, sim.tspan)
            dt = time() - t

            println("Simulation complete in $dt seconds")
            send(ws, to_console("done! in $dt seconds"))

            x = Dict(string.(states(sc.full_sys)) .=> states(sc.full_sys))
            println("Sending states to client")
            send(ws, to_states(x))
            println("Done")
         end
         if julia_msg["type"] == "plot"
            mtk_symbol = x[julia_msg["data"]]
            d = Dict("time" => sol.t, "data" => sol[mtk_symbol], "name" => julia_msg["data"])
            println("Sending data to client")
            send(ws, to_data(d))
         end
      end
      # iteration ends when the websocket connection is closed by client or error
   end
end

function dict_to_sim(d)
   (
      tspan=eval(Meta.parse(d["tspan"])),
   )
end

function dict_to_spacecraft(d)
   bstruct = bdict_to_bstruct(d["body"])
   rwstruct = rwdict_to_rwstruct.(d["reactionWheels"])
   thrstruct = thrdict_to_thrstruct.(d["thrusters"])
   irustruct = irudict_to_irustruct(d["iru"])
   controller = Controller(
      name=:controller
   )
   Spacecraft(
      name=:sc,
      body=bstruct,
      thrusters=thrstruct,
      reactionwheels=rwstruct,
      iru=irustruct,
      controller=controller,
      gravity=TwoBody(),
   )
end

function bdict_to_bstruct(d)
   J = Meta.parse.([
      d["ixx"] d["ixy"] d["ixz"]
      d["ixy"] d["iyy"] d["iyz"]
      d["ixz"] d["iyz"] d["izz"]
   ])
   Body(
      name=Symbol(d["name"]),
      J=J,
      q=eval(Meta.parse(d["q"])),
      ω=eval(Meta.parse(d["w"])),
      r=eval(Meta.parse(d["r"])),
      v=eval(Meta.parse(d["v"])),
   )
end

function rwdict_to_rwstruct(d)
   ReactionWheel(
      name=Symbol(d["name"]),
      J=Meta.parse(d["J"]),
      kt=Meta.parse(d["kt"]),
      a=eval(Meta.parse(d["a"])),
      ω=Meta.parse(d["w"])
   )
end

function thrdict_to_thrstruct(d)
   Thruster(
      name=Symbol(d["name"]),
      F=Meta.parse(d["F"]),
      r=eval(Meta.parse(d["r"])),
      R=eval(Meta.parse(d["R"])),
   )
end

function irudict_to_irustruct(d)
   RateGyro(
      name=Symbol(d["name"]),
      σ=Meta.parse(d["sigma"]),
   )
end