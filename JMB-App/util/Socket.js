import { io } from "socket.io-client";
import { API_URL } from './API_URL'

// const socket = io(`https://jmb-enterprise.onrender.com`);
const socket = io(`https://api.jmb-enterprises.in`);

export default socket