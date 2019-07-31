const conn = require('../connection/index');    //const conn = mysql.createConnection({})
const router = require('express').Router()
const isEmail = require('validator/lib/isEmail')
const bcrypt = require('bcrypt')
const multer = require('multer')

const path = require('path')
const fs = require('fs')

// console.log(__dirname);     // C:\Coding - Programming\streetcrown\back-end\src\routers
const avatarDirectory = path.join(__dirname + '/..' + '/userAvatar')
// console.log(avatarDirectory);    // C:\Coding - Programming\streetcrown\back-end\src\userAvatar


const ourFolder = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, avatarDirectory)
    },
    filename(req, file, cb) {
        // console.log(file)
            // originalname = kucing.jpg
        // upload timestamp + field name ('avatar') + .jpg
        // console.log('filename req.body :')
        // console.log(req.body);
        // cb(null, Date.now() + file.fieldname + path.extname(file.originalname) )

        cb(null, Date.now() + '-' + req.body.username + path.extname(file.originalname) )
    }
})

const multerConfiguration = multer({
    storage: ourFolder,
    limits: {
        fileSize: 1000000   //1 million bytes
    },
    fileFilter(req, file, cb) {
        // console.log('file:')
        // console.log(file)
        // console.log('fileFilter cb');
        // console.log(cb)
        
        let filterImageExtension = file.originalname.match(/\.(jpg|jpeg|png)$/) // true or false

        if (filterImageExtension === false) {
            cb( new Error('Please upload image with .jpg .png or .jpeg extension :)') )
        }

        // filterImageExtension === true
        cb(undefined, true);
    }
})

////////////////////////////////////////////////////////////////////////////
// AVATAR

//  UPLOAD AVATAR
router.post('/users/avatar', multerConfiguration.single('avatar'), (req,res) => {
    // router.post('/users/avatar', (req,res) => {
    // body/form-data (username, avatar)
    
    // console.log(req.body);  //[Object: null prototype] { username: 'reinhart' }

    // console.log(req.file)
    /* 
        file:
        { fieldname: 'avatar',
            originalname: 'doge.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            destination:
            'C:\\Coding - Programming\\streetcrown\\back-end\\src\\userAvatar',
            filename: '1564490212171-reinhart.jpg',
            path:
            'C:\\Coding - Programming\\streetcrown\\back-end\\src\\userAvatar\\1564490212171-reinhart.jpg',
            size: 3668 },
        __onFinished: null }
    */

    const sql = `SELECT * FROM users WHERE username = ?`
    const data = req.body.username

    const sql2 = `UPDATE users SET avatar = '${req.file.filename}' WHERE username = '${req.body.username}' ` 
    // const data2 = [req.file.filename, req.body.username]

    conn.query(sql, data, (err,result) => {
        if(err) return res.send(err)

        const user = result[0]

        if (!user) return res.send('User not found :(')

        conn.query(sql2, (err,result2) => {
            if (err) return res.send(err)

            res.send({
                message: 'Upload success :)',
                filename: req.file.filename
            })
        })
    })
});

// READ AVATAR
router.get('/users/avatar/:filename', (req,res) => {
    const options = {
        root: avatarDirectory
    }

    const fileNAME = req.params.filename

    // sendFile from express
    res.sendFile( fileNAME, options, (err) => {
        if(err) return res.send(err)
    })
});


// DELETE AVATAR (avatar column -> null & delete avatar pictures on userAvatar folder)
router.delete('/users/avatar', (req,res) => {

    // sql -> get avatar filename by specific username
    const sql = `SELECT avatar FROM users WHERE username = ?`
    const data_username = req.body.username
    // sql2 -> set null 
    const sql2 = `UPDATE users SET avatar = null WHERE username = ?`

    conn.query(sql, data_username, (err, result) => {
        if (err) return res.send(err);

        // res.send(result);
        const fileName = result[0].avatar
        const specificAvatarPath = avatarDirectory + '/' + fileName

        // async process
        fs.unlink(specificAvatarPath, (err) => {    // delete image from folder
            if(err) return res.send(err)

            conn.query(sql2, data_username, (err,result) => {
                if(err) return res.send(err)

                res.send(`${data_username}'s avatar has been deleted :)`)
            })
        })
    })
});

////////////////////////////////////////////////////////////////////////////////
// USERS


// REGISTER ONE USER
router.post('/users', (req,res) => {
    const sql = `INSERT INTO users SET ?`
    const data = req.body

    // Email must contain @blabla.bla
    if( !isEmail(data.email) ) {
        return res.send('Email is not valid :(')
    }

    // hashSync = alternative way without using async await
    data.password = bcrypt.hashSync(data.password, 8)

    conn.query(sql, data, (err, result) => {
        if (err) return res.send(err)

        // VERIFY EMAIL
        // 
        // 

        res.send(result);
    })
});

// VERIFY USER (GET)
router.get('/verify', (req,res) => {
    const sql = `UPDATE users SET verified = true WHERE username = ?`
    const data = req.query.username

    conn.query(sql, data, (err,result) => {
        if (err) return res.send(err)

        res.send(`<h2> Verification Success :) </h2>`)
    })
});

// LOGIN USER
router.post('/users/login', (req,res) => {
    // const sql = `SELECT username, name, email, phone_number, verified, avatar WHERE email = ?`
    const sql = `SELECT * FROM users WHERE email = ?`
    const data = req.body.email

    conn.query(sql, data, async (err,result) => {
        if(err) return res.send(err)

        const user = result[0]

        if(!user) return res.send(`User with ${req.body.email} not found :(`)

        // if user with specific email is found

        const isMatch = await bcrypt.compare(req.body.password, result[0].password)
        // console.log(isMatch);

        if (isMatch === false) return res.send('Wrong password :(')

        res.send(user);
    })
});

// READ USER PROFILE
router.get('/users/profile/:username', (req,res) => {
    const sql = `SELECT * FROM users WHERE username = ?`
    const data = req.params.username

    conn.query(sql, data, (err,result) => {
        if (err) return res.send(err)

        const user = result[0]

        if(!user) return res.send('User not found :(')

        // We need avatarurl to front-end
        res.send({
            username : user.username,
            name: user.name,
            email: user.email,
            phone_number : user.phone_number,
            is_admin : user.is_admin,
            avatarurl: `localhost:2019/users/avatar/${user.avatar}`
        })
    })
});

// UPDATE PROFILE (can update anything)
router.patch('/users/profile/:username', (req,res) => {

    // if user want to change password -> rehash !
    if(req.body.password) {
        req.body.password = bcrypt.hashSync(req.body.password, 8)
    }

    const sql = `UPDATE users SET ? WHERE username = ?`
    const data = [req.body, req.params.username]

    const sql2= `SELECT username, name, email, phone_number, password, verified FROM users WHERE username = ?`
    const data2 = req.params.username

    conn.query(sql, data, (err,result) => {
        if (err) return res.send(err)

        conn.query(sql2, data2, (err,result2) => {
            if (err) return res.send(err)

            res.send(result2[0]);
        })
    })
});









module.exports = router;