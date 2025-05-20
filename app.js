const express = require("express")
const app = express();
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const userModel = require("./models/user")
const postModel = require("./models/post")


app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,'public')))
app.use(cookieParser());

app.get("/",(req,res)=>{
    res.render("index")
})

app.post("/register",async(req,res)=>{
    let {email,username,name,password,age} =req.body;
    let user =await userModel.findOne({email})

    if(user) return res.status(500).send("User already exist!");

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async(err,hash)=>{
            const user = await userModel.create({
                email,
                username,
                name,
                age,
                password:hash,
            })
            const token = jwt.sign({email:email,userid:user._id},"shhhh")
            res.cookie("token",token);
            res.send("Registered!")
        })
    })
})

app.listen(3000)