const dns = require('dns');
// Force Node.js to use Google DNS for SRV lookups (fixes MongoDB Atlas connectivity)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const { StudentUploadRouter } = require('./routes/StudentuploadPyq.routes');
const { AdminUploadRouter } = require('./routes/AdminUpload.routes');
const { SearchRouter } = require('./routes/searchRouter.route');
const { AdminSearchRouter } = require('./routes/AdminDownload.routes');
const { userRouter } = require('./routes/User.routes');
const { superadminRouter } = require('./routes/SuperAdmin.routes');
const { AdminVerifyRouter } = require('./routes/AdminVerifyRouter.routes');
require('dotenv').config();
const app = express();
const cors = require('cors');
const { appendCaption } = require('./services/meetNotesStore');

// Database connection helper
const connectToDatabase = require('./config/bdUser');
const { toolsRouter } = require('./routes/Tools.route');
const { meetRouter } = require('./routes/Meet.routes');
const { classroomRouter } = require('./routes/Classroom.routes');
const { assignmentRouter } = require('./routes/Assignment.routes');
const { submissionRouter } = require('./routes/Submission.routes');
const { adminRouter } = require('./routes/Admin.routes');
connectToDatabase();
const port = process.env.PORT || 4000;


app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => {
    res.send({ message: "✅ Server is working!" });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()) + 's',
        gemini: !!process.env.GEMINI_API_KEY,
    });
});

app.use('/student', StudentUploadRouter);

app.use('/adminupload', AdminUploadRouter);
app.use('/admindownload', AdminSearchRouter);
app.use('/adminverifydownload', AdminVerifyRouter);
app.use('/search', SearchRouter);

app.use('/user', userRouter);
app.use('/superadmin', superadminRouter);
app.use('/tools', toolsRouter)
app.use('/meet', meetRouter)
app.use('/classroom', classroomRouter)
app.use('/assignment', assignmentRouter)
app.use('/submission', submissionRouter)
app.use('/admin', adminRouter)


// ---- HTTP + Socket.io ----
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.set('io', io);

io.on('connection', (socket) => {
    socket.on('join:classroom', ({ classroomId }) => {
        if (!classroomId) return;
        socket.join(`classroom:${classroomId}`);
    });

    socket.on('leave:classroom', ({ classroomId }) => {
        if (!classroomId) return;
        socket.leave(`classroom:${classroomId}`);
    });

    // Live captions: client pushes text; server broadcasts + stores for summarization
    socket.on('meet:caption', ({ classroomId, text, from }) => {
        if (!classroomId || !text) return;
        appendCaption(classroomId, text);
        io.to(`classroom:${classroomId}`).emit('meet:caption', {
            classroomId,
            text,
            from: from || 'participant',
            at: new Date().toISOString(),
        });
    });
});

server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
