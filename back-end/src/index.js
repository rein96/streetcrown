const express = require('express')
const cors = require('cors')

// Router
const userRouter = require('./routers/userRouter')


const app = express();
const port = 2019;

// To prevent CORS ERROR when front-end do http request( axios )
app.use(cors())

// For JSON FORMAT
app.use(express.json())
app.use(userRouter)



app.listen(port, () => {
    console.log('StreetCrown API is running at ' + port)
})