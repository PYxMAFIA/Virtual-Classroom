const requireTeacher = (req, res, next) => {
    if (!req.user || req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Teachers only' });
    }

    next();
};

module.exports = { requireTeacher };
