const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Type = require('../models/Type');
const Major = require('../models/Major');
const passport = require('passport');
const session = require('express-session');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const async = require('hbs/lib/async');
const body_parser = require('body-parser');
const saltRounds = 10;
require('../passport-setup')
const Scholarship = require('../models/Scholarship');
const { assign } = require('nodemailer/lib/shared');

router.get('/testsch',(req,res)=>{
  res.render('users/testlsch')
})

router.use(
  session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false},
  })
)


router.use (passport.initialize ());
router.use (passport.session());


function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}


// -UI- หน้าล็อกอิน
router.get('/page', async(req, res, next) =>{
  let loginStatus = ''
  let rec = await Scholarship.find().limit(10).exec()
  res.render('users/pagelogin',{loginStatus:loginStatus,rec : rec});
});



// แสดงข้อมูลของผู้ใช้
router.get('/content',isLoggedIn, async (req, res, next) => {
  const uemail = await req.user.email
  User.findOne({'uemail':uemail}).exec(doc)
  res.render('users/contentpage',{user:doc})
  console.log(doc)
});



// - email GG authen api - /////////////////////////////////////////////////////////////////////////

router.get('/google',
  passport.authenticate('google', { scope: ['email', 'profile']})
);

router.get('/login/google/callback',
  passport.authenticate('google' , {
    successRedirect: '/users/protected',
    failureRedirect: '/users/auth/failure',
  })
);

router.get('/protected',isLoggedIn, async (req,res) => {  //
  // res.send(`Hello ${req.user.email}`)
  const email = await req.user.email
  const auth_email = await User.findOne({'uemail':email})
  const emtry = ['null', '[]' ,'""']
  
  if(auth_email == emtry['']){
    console.log('Email is not register')
    console.log(email)
    console.log(auth_email)
    res.render('users/googlelogin',{uemail:email})
  } else{
    console.log('yes you have an account')
    console.log(email)
    res.redirect('/users/homepage')
    // console.log(auth_email)
    // let rec = await Scholarship.find({stype:auth_email.ustype,sfaculty:{$in:auth_email.ufaculty},sbranch:{$in:auth_email.ubranch},sgpa:{$lte:auth_email.ugpa},sclass:auth_email.uclass}).exec()
    // console.log(rec)
    // res.render('loginsystem/contentpage',{userdata:auth_email,rec:rec})  //homepage
  }

  // res.render('googlelogin',{uemail:email})
  // console.log(email)
})

router.get('/auth/failure', (req,res) => {
  res.send('Some thing is wrong..')
})

router.get('/logout', (req,res) => {
  req.session.destroy();
  res.redirect('/users/page')
})

///////////////////////////////////////////////////////////////////////////////////////////////////


// หน้าโฮมเพจ แนะนำทุนที่เหมาะกับผู้ใช้
router.get('/homepage',isLoggedIn, async (req,res) => {
  const email = await req.user.email
  const auth_email = await User.findOne({'uemail':email})
  let rec = await Scholarship.find({stype:auth_email.ustype,sfaculty:{$in:auth_email.ufaculty},sbranch:{$in:auth_email.ubranch},sgpa:{$lte:auth_email.ugpa},sclass:auth_email.uclass}).exec()
  console.log(rec)
  res.render('users/contentpage',{userdata:auth_email,rec:rec})
})


// สมัครใช้งาน
router.post('/register', async(req, res, next) =>{
  const pass = req.body.pass
  const hash = await bcrypt.hash(pass,10)
  let data = new User({
    uemail:req.body.uemail,
    upass:hash,
    ufname:req.body.ufname,
    ulname:req.body.ulname,
    ustype:req.body.ustype,
    ufaculty:req.body.ufaculty,
    ubranch:req.body.ubranch,
    uclass:req.body.uclass,
    ugpa:req.body.ugpa,
    utoeic:req.body.utoeic,
    uielts:req.body.uielts,
    utoefl:req.body.utoefl,
    pinned:req.body.pinned,
    phonenumber:req.body.phonenumber
  })
  const checkemail = await User.find({uemail:data['uemail']})

  if(checkemail  != ''){
    // res.send('this email is registed !! you can go to login')
    // res.render('/users/page')
  }else{
    console.log(data['uemail'])
    User.saveUser(data)
      res.send('register Succesful ! pleace go to login ')
      // res.render('/users/page')
      console.log('register success')
  }
})

//localhost:3000/users/loginmobile
// router.post('/loginmobile',async(req, res ,next) => {
//   const data = await {
//     "uemail": req.body,
//     "upass": req.body
//   }
//   console.log(data);
//   const user = await User.find({uemail:data.uemail});
//   console.log("---------------",user);
//   if (!user){
//     // throw new Error('User dont exist')
//       console.log('User dont exist')
//   }else{
//       const isMatch = bcrypt.compareSync(data.upass, user.upass);
//       if(isMatch === false) {
//         // throw new Error('Password Invalid')
//           console.log('Password Invalid')
//       }
//       let tokenData = {uemail:user.uemail};
//       const token = await UserService.generateToken(tokenData,"secretKey",'1h')

//       res.status(200).json({status:true,token:token})
//     }}
// )

// router.post('/loginmobile',UserController.login);


// -mobile api- ระบบล็อกอิน 
router.post('/loginmobile',async (req, res, next) => {
  const {uemail, upass} = await req.body
        console.log(uemail);
        console.log(upass);
        const user = await User.findOne({uemail:uemail});
        console.log("---------------",user);
        if(user){
          const isCorrect = bcrypt.compareSync(upass, user.upass);
          console.log(isCorrect)
          req.user = user;
          if(isCorrect){
            console.log('Login succsess !!!')
            res.status(200).json({status:true})
          }else{
            console.log('Password is invalid !!')
            res.status(200).json({status:false})
          }
        }else{
          console.log('Email not register')
        }
});


// -mobile GG check api- ระบบล็อกอิน 
router.post('/googleloginmobile', async (req, res, next)=>{
  const uemail = await req.body.uemail
  console.log(uemail)
  const user = await User.findOne({uemail:uemail})
  console.log(user)
    if(user != null) {
      console.log('This email is registed !!')
      res.status(200).json({status:true})
    }else{
      console.log('This email not registed  you can register !!')
      res.status(200).json({status:false})
    }
})


// -mobile api loguot- ระบบล็อกเอาท์
router.post('/mobilelogout', async (req, res, next)=>{
  const logout = await req.body.logout
  console.log(logout)
  if(logout === 'Logout') {
    console.log('This email is registed !!')
    res.status(200).json({status:true})
  }else{
    console.log('This email not registed  you can register !!')
    res.status(200).json({status:false})
  }
})


// -api- ระบบล็อกอิน
router.post('/login', async (req, res, next) => {
  const uemail = await req.body.uemail
  const upass = await req.body.upass
  const user = await User.findOne({uemail:uemail});
  console.log(uemail)
  console.log(upass)
  console.log(user)
  if (user) {
    const isCorrect = bcrypt.compareSync(upass, user.upass);
    req.user = user;
    if(isCorrect) {
      // res.redirect('/users/homepage')
      let rec = await Scholarship.find({stype:user.ustype,sfaculty:{$in:user.ufaculty},sbranch:{$in:user.ubranch},sgpa:{$lte:user.ugpa},sclass:user.uclass}).exec()
      console.log(rec)
      res.render('users/contentpage',{userdata:user,rec:rec})
      // req.user = user;
    } else {
      let loginStatus = 'Password is Incorrect !'
      res.render('users/pagelogin',{loginStatus:loginStatus})
    }
  } else{
    let loginStatus = 'This email is not Register !'
    res.render('users/pagelogin',{loginStatus:loginStatus})
  }
})


//แสดงรายการทุน
router.get('/scholarship',(req,res) => {
  Scholarship.find().limit(80).exec().then((doc,err) => {
      res.render('users/scholarshipUserView',{scholarships:doc})
  })
})



// -UI- ฟิลเตอร์ทุน
router.get('/filter',async (req,res)=> {
  let l_stype = await Scholarship.distinct('stype').exec() //ประเทภทุน
  let l_facu = await Major.distinct('faculty').exec() //คณะ
  let l_branch = await Major.distinct('branch').exec() //สาขา
  let l_uni = await Scholarship.distinct('university').exec() //มหาวิทยาลัย
  let l_country = await Scholarship.distinct('country').exec() //ประเทศ //ขอบเขต //เกรด 
  let l_costoflive = await Scholarship.distinct('costoflive').exec()
  let l_costoflean = await Scholarship.distinct('costoflean').exec()
  let l_costofabode = await Scholarship.distinct('costofabode').exec()


  res.render('users/userfilter',
  {
    scholarshipstype:l_stype,
    scholarshipsfacu:l_facu,
    scholarshipsbranch:l_branch,
    scholarshipsuni:l_uni,
    l_country:l_country,
    l_costoflive:l_costoflive,
    l_costoflean:l_costoflean,
    l_costofabode:l_costofabode
})
})


// -api- ค้นหาจากฐานข้อมูล
router.use('/result', async (req, res) => {
  //ชื่อทุน
  let ft_stype = await req.body.ft_stype //ประเภท 
  let ft_facu = await req.body.ft_facu //คณะ
  let ft_branch = await req.body.ft_branch //สาขา
  let ft_uni = await req.body.ft_uni //มหาวิทยาลัย
  let ft_gpa = await req.body.ft_gpa //เกรด
  let ft_country = await req.body.ft_country //ประเทศ
  let ft_sclass = await req.body.ft_sclass //ระดับการศึกษา
   //ขอบเขตทุน
  let ft_costoflive = await req.body.ft_costoflive
  let ft_costoflean = await req.body.ft_costoflean
  let ft_costofabode = await req.body.ft_costofabode

  //allcase
  let allstypeList =await Scholarship.distinct('stype').exec()
  let allfacultyList =await Scholarship.distinct('sfaculty').exec()
  let allbranchList =await Scholarship.distinct('sbranch').exec()
  let allunivesityList =await Scholarship.distinct('university').exec()
  let allgpaList =await Scholarship.distinct('sgpa').exec()
  let allcountlyList =await Scholarship.distinct('country').exec()

  let allcostoflive =await Scholarship.distinct('costoflive').exec()
  let allcostoflean =await Scholarship.distinct('costoflean').exec()
  let allcostofabode =await Scholarship.distinct('costofabode').exec()


  if(ft_sclass == 'all'){
      ft_sclass = ['มัธยม','ปริญญาตรี','ปริญญาโท','ปริญญาเอก']
  }
  if(ft_stype== 'all'){
      let allstypeList =await Scholarship.distinct('stype').exec()
      ft_stype = allstypeList
  }
  if(ft_facu == 'all'){
      let allfacultyList =await Scholarship.distinct('sfaculty').exec()
      ft_facu = allfacultyList
  }
  if(ft_branch == 'all'){
      let allbranchList =await Scholarship.distinct('sbranch').exec()
      ft_branch = allbranchList
  }
  if(ft_uni == 'all'){
      let allunivesityList =await Scholarship.distinct('university').exec()
      ft_uni = allunivesityList
  }
  if(ft_gpa == 'all'){
      let allgpaList =await Scholarship.distinct('sgpa').exec()
      ft_gpa = allgpaList
  }
  if(ft_country == 'all'){
      let allcountlyList =await Scholarship.distinct('country').exec()
      ft_country = allcountlyList
  }

  // -ขอบเขคทุน
  if(ft_country == 'all'){
      let allcountlyList =await Scholarship.distinct('country').exec()
      ft_country = allcountlyList
  }
  if(ft_country == 'all'){
      let allcountlyList =await Scholarship.distinct('country').exec()
      ft_country = allcountlyList
  }
  if(ft_country == 'all'){
      let allcountlyList =await Scholarship.distinct('country').exec()
      ft_country = allcountlyList
  }

  if(ft_costoflive == 'all'){
      let allcostoflive =await Scholarship.distinct('costoflive').exec()
      ft_costoflive = allcostoflive
  }
  if(ft_costoflean == 'all'){
      let allcostoflean =await Scholarship.distinct('costoflean').exec()
      ft_costoflean = allcostoflean
  }
  if(ft_costofabode == 'all'){
      let allcostofabode =await Scholarship.distinct('costofabode').exec()
      ft_costofabode = allcostofabode
  }

  await Scholarship.find({
      stype:ft_stype,
      sfaculty:{$in:ft_facu},
      sbranch:{$in:ft_branch},
      university:ft_uni,
      sgpa:{$lte:ft_gpa},
      sclass:ft_sclass,
      country:ft_country,
      costoflive:ft_costoflive,
      costoflean:ft_costoflean,
      costofabode:ft_costofabode
  }).exec().then((doc)=> {
      res.render('users/userresultfilter',{scholarships:doc})

      // res.send(doc)
      // console.log(doc)
  })
  // console.log(ft_stype)
  // console.log(ft_facu)
  // console.log(ft_branch)
  // console.log(ft_uni)
  // console.log(ft_gpa)
  // console.log(ft_sclass)
})



// -ปักหมุด-
router.post('/pinin',isLoggedIn, async (req,res,next) => {
  // const emtry = ['null', '[]' ,'""']
  const email = await req.user.email
  let whatpage = await req.body.whatpage
  let sculs_id = await req.body.pin_id
  let udoc = await User.find({'uemail':email,'pinned':sculs_id}).exec()
  let pincount = await Scholarship.findOne({'_id':sculs_id}).exec()
  console.log(whatpage)

  if(udoc == '' ){
    await User.updateOne({'uemail':email},{$push:{'pinned':sculs_id}})
    console.log('pinned!!')
    console.log(udoc)
    let resultcount = pincount['pinnedcount'] + 1;
    await Scholarship.updateOne({'_id':sculs_id},{$set:{'pinnedcount':resultcount}})
    switch(whatpage){
      case 'page0':
        res.redirect('/users/pinscholarship')
        break;
      case 'page1':
        res.redirect('/users/scholarship')
        break;
    }
  } else{
    await User.updateOne({'uemail':email,'pinned':sculs_id},{$pull:{'pinned':sculs_id}})
    console.log('unpined!!')
    // console.log(udoc)
    let resultcount = pincount['pinnedcount'] - 1;
    await Scholarship.updateOne({'_id':sculs_id},{$set:{'pinnedcount':resultcount}})
    switch(whatpage){
      case 'page0':
        res.redirect('/users/pinscholarship')
        break;
      case 'page1':
        res.redirect('/users/scholarship')
        break;
    }
  }
})


// -ถอนหมุด-
router.get('/pinscholarship',isLoggedIn,async (req,res) =>{
  const email = await req.user.email
  let scholarship_id = await User.findOne({'uemail':email}).exec()
  let id_list = scholarship_id['pinned']
  console.log(id_list)
  await Scholarship.find({'_id':id_list}).exec().then((saerch_result)=>{
    console.log(saerch_result)
    res.render('users/pinscholarship',{scholarships:saerch_result})
  })
})


// แก้ใขข้อมูลส่วนตัว
router.post('/useredit', async (req,res) => {
  const edit_id = await req.body.edit_id
  let l_stype = await Type.distinct('scholarship_type').exec()
  let l_facu = await Major.distinct('faculty').exec()
  let l_branch = await Major.distinct('branch').exec()
  console.log(edit_id)
  await User.findOne({'_id':edit_id}).exec().then((doc,err) => {
      res.render('users/editprofile',{userdata:doc,scholarshipstype:l_stype,l_facu:l_facu,l_branch:l_branch})
  })
})


// -api- อัปเดตข้อมูลส่วนตัวผู้ใช้
router.post('/userupdate',(req, res) =>{
  const update_id = req.body.update_id
  let data = {
      ufname:req.body.ufname,
      ulname:req.body.ulname,
      ufaculty:req.body.ufaculty,
      ubranch:req.body.ubranch,
      uclass:req.body.uclass,
      ugpa:req.body.ugpa,
      utoeic:req.body.utoeic,
      uielts:req.body.uielts,
      utoefl:req.body.utoefl,
      phonenumber:req.body.phonenumber,
      ustype:req.body.ustype,
  }
  User.findByIdAndUpdate(update_id,data).exec().then((err) => {
      res.redirect('/users/protected')
      console.log('Edited!!')
  })
})

router.get('/this/:id',isLoggedIn,(req,res) => {
  const this_id = req.params.id
  Scholarship.findOne({_id:this_id}).exec().then((doc,err) => {
      console.log(doc)
      res.render('users/thisscholarship',{scholarships:doc})
  })
})


module.exports = router;
