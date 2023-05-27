using HTTP.WebSockets, JSON3, Revise

function dict_to_json(d)
   io = IOBuffer()
   JSON3.pretty(io,d)
   String(take!(io))
end

function to_console(msg)
   d = Dict("type"=>"console","data"=>msg)   
   dict_to_json(d)
end

function to_data(data)
   d = Dict("type"=>"data","data"=>data)   
   dict_to_json(d)
end

function jsat_server()
   includet("test.jl")
  # server  
   WebSockets.listen("127.0.0.1", 8081) do ws

      println("Client Connected, Simulating")      
      send(ws,to_console("Simulating"))

      t = time()
      sol,sim = simulate(sc, (0, 100));      
      dt = time()-t

      println("Done in $dt seconds")
      send(ws,to_console("Done in $dt seconds"))
      
      println("Converting data to JSON")
      d = Dict("time"=>sol.t,"quat"=>sol[sc.body.sys.q])      

      println("Sending data to client")
      send(ws,to_data(d))

      println("Done")
      # iterate incoming websocket messages      
      #for msg in ws
         # send message back to client or do other logic here         
      #$println(sol[sc.body.sys.q])
      
      #end
      # iteration ends when the websocket connection is closed by client or error
   end
end

