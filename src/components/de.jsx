// import { useEffect, useRef, useState } from 'react';
// import io from 'socket.io-client';

// const socket = io('http://localhost:4000');

// function Globalchat() {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const socket = useRef();

//   useEffect(() => {
//     socket.current = io('http://localhost:4000');

//     socket.current.on('messageHistory', (history) => {
//       setMessages(history);
//     });

//     socket.current.on('newMessage', (msg) => {
//       setMessages(prev => [...prev, msg]);
//     });

//     return () => {
//       socket.current.disconnect();
//     };
//   }, []);

//   const sendMessage = () => {
//     if (input.trim()) {
//       socket.current.emit('sendMessage', {
//         content: input,
//         sender: 'User' // Replace with actual username
//       });
//       setInput('');
//     }
//   };

//   return (
//     <div className="chat-container">
//       <div className="messages">
//         {messages.map(msg => (
//           <div key={msg.id} className="message">
//             <strong>{msg.sender}</strong>: {msg.content}
//           </div>
//         ))}
//       </div>
//       <input
//         value={input}
//         onChange={(e) => setInput(e.target.value)}
//         onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
//       />
//       <button onClick={sendMessage}>Send</button>
//     </div>
//   );
// }


// export default Globalchat;
