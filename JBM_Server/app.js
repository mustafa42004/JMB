const express = require('express');
const app = express();
const cors = require('cors');
let http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Allow your React app's origin
        methods: ["GET", "POST"], // Allowed methods
        allowedHeaders: ["Authorization"], // Headers you allow
        credentials: true // Allow cookies to be sent
    }
});
const routes = require('./config/allRoutes')(io);

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({extended : true}))
app.use(cors());
app.use(routes);


const port = process.env.PORT || 8080;
server.listen(port, (req, res)=>{
    console.log("server running with port | "+port)
})