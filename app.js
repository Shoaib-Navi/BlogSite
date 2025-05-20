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

app.get("/register",(req,res)=>{
    res.render("index")
})

//Registeration
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

//login
app.get("/login",(req,res)=>{
    res.render("login")
})
app.post("/login",async(req,res)=>{
    let {email,password} =req.body;

    let user =await userModel.findOne({email});
    if(!user) return res.status(400).send("Something went wrong!");

    bcrypt.compare(password,user.password,(err,result)=>{
        if(result){
            let token = jwt.sign({email:email,userid:user._id},"shhhh");
            res.cookie("token",token);
            res.status(200).redirect("/profile")
        }else{
            res.redirect("/login")
        }
    })
    
})

//Profile
app.get("/profile",isLoggedIn,async(req,res)=>{
    let user = await userModel.findOne({email: req.user.email}).populate("posts")
    res.render("profile",{user})
})

//Logout
app.get("/logout",(req,res)=>{
    res.cookie("token","");
    res.redirect("/login")
})

//session function
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    // If no token, redirect immediately
    if (!token) {
        res.redirect("/login");
        return;
    }
    // Try to verify the token
    jwt.verify(token, "shhhh", (err, decoded) => {
        if (err) {
            res.redirect("/login");
            return;
        }
        req.user = decoded;
        next();
    });
}


app.listen(3000)