const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Type = require('../models/Type');
const Major = require('../models/Major');
const passport = require('passport');
const session = require('express-session')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const async = require('hbs/lib/async');
const saltRounds = 10;
require('../passport-setup')
const Scholarship = require('../models/Scholarship');
const Admin = require('../models/Admin');
const { parse } = require('dotenv');


router.get('/logout', (req, res) => {
    res.redirect('/scholarships/login')
})

//แจ้งเตือน
router.get('/alert', (req, res) => {
    res.render('popup/addalert')
})

//ค้นหา 
//ส่งผลการค้นหา
router.post('/gettextsearch', async(req, res) => {
    let keysearch = await req.body.keysearch.trim()
    let saerch_result = await Scholarship.find({ $or: [{ sname: { $regex: new RegExp('^' + keysearch + ',*', 'i') } }, { stype: { $regex: new RegExp('^' + keysearch + ',*', 'i') } }] }).exec()

    console.log(keysearch)
    res.send(saerch_result)
    console.log(saerch_result)
})

//แสดงรายการที่ตรงกัน
router.post('/getResult', async(req, res) => {
    let payload = req.body.payload.trim()
    if (payload == '') {
        payload = '---'
    }
    if (payload == '[') {
        payload = '---'
    }
    if (payload == '[]') {
        payload = '---'
    }
    let search = await Scholarship.find({ $or: [{ sname: { $regex: new RegExp('^' + payload + ',*', 'i') } }, { stype: { $regex: new RegExp('^' + payload + ',*', 'i') } }] }).exec()
        //let search = await Scholarship.find({sname: {$regex: new RegExp('^'+payload+',*','i')}}).exec()
    search = search.slice(0, 10)
    res.send({ payload: search })
        // console.log(payload)
})

router.get('/dbUI', function(req, res) {
    res.render('admins/dashboardui');
})



router.get('/Maindashboard', async(req, res, next) => {
    //scholarships
    let scholarshipsAmount = await Scholarship.count().exec()
    let facultyAmount = await Scholarship.distinct('sfaculty').count().exec()
    let branchAmonut = await Scholarship.distinct('sbranch').count().exec()
    let facultyFamost = await Scholarship.distinct('sfaculty').exec()

    //users
    let usersAmount = await User.count().exec()

    //admins
    let adminAmount = await Admin.count().exec()

    //log
    console.log(scholarshipsAmount)
    console.log(facultyAmount)
    console.log(branchAmonut)
    console.log(facultyFamost)
    console.log(usersAmount)
    console.log(adminAmount)

    res.render('dashboard/maindashboard', {
        scholarshipsAmount: scholarshipsAmount,
        facultyAmount: facultyAmount,
        branchAmonut: branchAmonut,
        facultyFamost: facultyFamost,
        usersAmount: usersAmount,
        adminAmount: adminAmount
    });
});


// ระบบแอดมินล็อกอิน ////////////////////////////////////////////////////////////////////////////////////////////////////////
//dashboard
router.get('/', function(req, res, next) {
    res.render('dashboard/index');
});


router.get('/dashboard', async(req, res, next) => {
    let scholarshipsAmount = await Scholarship.count().exec()
    let facultyAmount = await Scholarship.distinct('sfaculty').count().exec()
    let branchAmonut = await Scholarship.distinct('sbranch').count().exec()
    let facultyFamost = await Scholarship.distinct('sfaculty').exec()
    console.log(scholarshipsAmount)
    console.log(facultyAmount)
    console.log(branchAmonut)
    console.log(facultyFamost)
    res.render('dashboard/index', {
        scholarshipsAmount: scholarshipsAmount,
        facultyAmount: facultyAmount,
        branchAmonut: branchAmonut
    });
});


//เข้าหน้าล็อกอิน
router.get('/login', (req, res) => {
    let loginStatus = ''
    res.render('admins/adminslogin', { loginStatus: loginStatus })
})


//ตรวจสอบข้อมูล
router.post('/sendDatalogin', async(req, res) => {
    const mainAdmin = 'mainAdmin@webscrapmail.com'
    let adminName = await req.body.admin_name
    let adminPass = await req.body.admin_password

    if (adminName == mainAdmin) {
        console.log(mainAdmin)
        const adminpws = await Admin.findOne({ aname: mainAdmin }).exec()
        const isCorrect = bcrypt.compareSync(adminPass, adminpws.apws);
        if (isCorrect) {
            console.log('Login success!!')
            res.redirect('/scholarships/maindashboard')
        } else {
            //รอทำแจ้งเตือน
            let loginStatus = 'Password is Incorrect!'
            console.log('Main admin password invalid !!')
            res.render('admins/adminslogin', { loginStatus: loginStatus })
        }
    } else {
        console.log('this account is sub admin account')
        let subAccount = await Admin.findOne({ aname: adminName }).exec()
        if (!!subAccount) {
            console.log('Can find Data!!')
            const subadminpws = await Admin.findOne({ aname: adminName }).exec()
            const isCorrect = bcrypt.compareSync(adminPass, subadminpws.apws);
            if (isCorrect) {
                console.log('Login success!!')
                if (subAccount.account_activate_state == false) {
                    console.log('Go to activate admin account!!')
                    res.render('admins/adminActivate', { subadmindata: subAccount })
                } else {
                    console.log('Login success!')
                    res.redirect('/admins/dashboard')
                }
            } else {
                //รอทำแจ้งเตือน
                let loginStatus = 'Password is Incorrect!'
                console.log('admin password invalid !!')
                res.render('admins/adminslogin', { loginStatus: loginStatus })
            }
        } else {
            let loginStatus = 'Not found this Account !'
                //รอทำแจ้งเตือน
            console.log('admin password invalid !!')
            res.render('admins/adminslogin', { loginStatus: loginStatus })
        }
    }
})


// -แอดมินรอง- ยืนยันบัญชี
router.post('/activateAccount', async(req, res) => {
    const adminID = await req.body.admin_id
    const acctivatepwsone = await req.body.onepassword
    const acctivatepwstwo = await req.body.twopassword
    console.log(adminID)
    if (acctivatepwsone == acctivatepwstwo) {
        const hash = await bcrypt.hash(acctivatepwsone, 10)
        let activate = {
            apws: hash,
            account_activate_state: true
        }
        Admin.findByIdAndUpdate(adminID, activate).exec().then((err) => {
            res.redirect('/scholarships/login')
            console.log('Activated!!')
        })
    }
})


// -แอดมินหลัก- หน้าแรก หลังจากล็อกอิน 
router.get('/mainadminpage', (req, res) => {
    res.render('admins/mainadminpage')
})


// -แอดมินหลัก- หน้าแสดงรายการจัดการแอดมินรอง
router.get('/adminlist', (req, res) => {
    Admin.find({ aname: { $ne: 'mainAdmin@webscrapmail.com' } }).exec().then((doc, err) => {
        res.render('admins/subadminlist', { admindata: doc })
    })
})


// -แอดมินหลัก- เพิ่มแอดมินรอง
router.get('/addAdmin', (req, res, next) => {
    res.render('admins/addadmin')
})


// -แอดมินหลัก- เปลี่ยนสถานะการยืนยันบัญชีของแอดมินรอง
router.get('/activateStateChange/:id', async(req, res, next) => {
    let status = await Admin.findById(req.params.id).exec()
    console.log(status)
    if (status.account_activate_state == true) {
        let pass = '1234'
        const hash = await bcrypt.hash(pass, 10)
        let new_activate_state = {
            apws: hash,
            account_activate_state: false
        }
        Admin.findByIdAndUpdate(req.params.id, new_activate_state).exec().then((err) => {
            console.log('Change status success!!')
        })
    } else {
        let new_activate_state = {
            account_activate_state: true
        }
        Admin.findByIdAndUpdate(req.params.id, new_activate_state).exec().then((err) => {
            console.log('Change status success!!')
        })
    }
    res.redirect('/scholarships/adminlist')
})


// -api- เพิ่มข้อมูลแอดมินรอง
router.post('/insertAdmin', async(req, res) => {
    const AdminName = await req.body.admin_name
    const AdminPassword = await req.body.admin_password
    const AdminActivateStatus = await req.body.activateStatus
    console.log(AdminName)
    console.log(AdminPassword)
    console.log(AdminActivateStatus)
    const hash = await bcrypt.hash(AdminPassword, 10)
    let data = new Admin({
        aname: req.body.admin_name,
        apws: hash,
        account_activate_state: req.body.activateStatus
    })
    Admin.saveAdmin(data)
    res.redirect('/scholarships/adminlist')
    console.log('insert admin success!!')
})


// -แอดมินหลัก- ลบแอดมินรอง
router.get('/admindelete/:id', (req, res) => {
    Admin.findByIdAndDelete(req.params.id).exec()
    res.redirect('/scholarships/adminlist')
    console.log('deleted!!')
})

// การจัดการทุน ////////////////////////////////////////////////////////////////////////////////////////////////////////


//แสดงรายการทุนทั้งหมด
router.get('/list', (req, res) => {
    Scholarship.find().limit(80).exec().then((doc, err) => {
        res.render('admins/scholarshiplist', { scholarships: doc })
    })
})

router.get('/slist', (req, res) => {
    Scholarship.find().limit(80).exec().then((doc, err) => {
        res.render('subadmins/subscholarshiplist', { scholarships: doc })
    })
})


// -UI- เพิ่มทุน
router.get('/insertdata', async(req, res, next) => {
    let l_stype = await Type.distinct('scholarship_type').exec()
    let l_facu = await Major.distinct('faculty').exec()
    let l_branch = await Major.distinct('branch').exec()
    res.render('admins/insertscholarship', { scholarshipstype: l_stype, l_facu: l_facu, l_branch: l_branch })
})


// -api- บันทึกข้อมูลลงฐานข้อมูล
router.post('/insert', (req, res, next) => {
    let data = new Scholarship({
        sid: req.body.sid,
        sname: req.body.sname,
        stype: req.body.stype,
        opendate: req.body.opendate,
        closedate: req.body.closedate,
        sfaculty: req.body.sfaculty,
        sclass: req.body.sclass,
        sbranch: req.body.sbranch,
        sgpa: req.body.sgpa,
        country: req.body.country,
        university: req.body.university,
        costoflive: req.body.costoflive,
        costoflean: req.body.costoflean,
        costofabode: req.body.costofabode,
        stoeic: req.body.stoeic,
        sielts: req.body.sielts,
        stoefl: req.body.stoefl,
        sgiver: req.body.sgiver,
        url: req.body.url,
        pinnedcount: 0,
        scrapdate: req.body.scrapdate,
        watchcount: 0
    })
    Scholarship.saveScholarship(data)
    res.redirect('/scholarships/list')
    console.log('insert success!!')
})



router.get('/addalert', (req, res) => {
    res.render('popup/addalert')
})


// -UI- ฟิลเตอร์ทุน
router.get('/filter', async(req, res) => {
    let l_stype = await Scholarship.distinct('stype').exec() //ประเทภทุน
    let l_facu = await Major.distinct('faculty').exec() //คณะ
    let l_branch = await Major.distinct('branch').exec() //สาขา
    let l_uni = await Scholarship.distinct('university').exec() //มหาวิทยาลัย
    let l_country = await Scholarship.distinct('country').exec() //ประเทศ //ขอบเขต //เกรด 
    let l_costoflive = await Scholarship.distinct('costoflive').exec()
    let l_costoflean = await Scholarship.distinct('costoflean').exec()
    let l_costofabode = await Scholarship.distinct('costofabode').exec()


    res.render('admins/filter', {
        scholarshipstype: l_stype,
        scholarshipsfacu: l_facu,
        scholarshipsbranch: l_branch,
        scholarshipsuni: l_uni,
        l_country: l_country,
        l_costoflive: l_costoflive,
        l_costoflean: l_costoflean,
        l_costofabode: l_costofabode
    })
})


// -api- ค้นหาจากฐานข้อมูล
router.use('/result', async(req, res) => {
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
    let allstypeList = await Scholarship.distinct('stype').exec()
    let allfacultyList = await Scholarship.distinct('sfaculty').exec()
    let allbranchList = await Scholarship.distinct('sbranch').exec()
    let allunivesityList = await Scholarship.distinct('university').exec()
    let allgpaList = await Scholarship.distinct('sgpa').exec()
    let allcountlyList = await Scholarship.distinct('country').exec()

    let allcostoflive = await Scholarship.distinct('costoflive').exec()
    let allcostoflean = await Scholarship.distinct('costoflean').exec()
    let allcostofabode = await Scholarship.distinct('costofabode').exec()


    if (ft_sclass == 'all') {
        ft_sclass = ['มัธยม', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก']
    }
    if (ft_stype == 'all') {
        let allstypeList = await Scholarship.distinct('stype').exec()
        ft_stype = allstypeList
    }
    if (ft_facu == 'all') {
        let allfacultyList = await Scholarship.distinct('sfaculty').exec()
        ft_facu = allfacultyList
    }
    if (ft_branch == 'all') {
        let allbranchList = await Scholarship.distinct('sbranch').exec()
        ft_branch = allbranchList
    }
    if (ft_uni == 'all') {
        let allunivesityList = await Scholarship.distinct('university').exec()
        ft_uni = allunivesityList
    }
    if (ft_gpa == 'all') {
        let allgpaList = await Scholarship.distinct('sgpa').exec()
        ft_gpa = allgpaList
    }
    if (ft_country == 'all') {
        let allcountlyList = await Scholarship.distinct('country').exec()
        ft_country = allcountlyList
    }

    // -ขอบเขคทุน
    if (ft_country == 'all') {
        let allcountlyList = await Scholarship.distinct('country').exec()
        ft_country = allcountlyList
    }
    if (ft_country == 'all') {
        let allcountlyList = await Scholarship.distinct('country').exec()
        ft_country = allcountlyList
    }
    if (ft_country == 'all') {
        let allcountlyList = await Scholarship.distinct('country').exec()
        ft_country = allcountlyList
    }

    if (ft_costoflive == 'all') {
        let allcostoflive = await Scholarship.distinct('costoflive').exec()
        ft_costoflive = allcostoflive
    }
    if (ft_costoflean == 'all') {
        let allcostoflean = await Scholarship.distinct('costoflean').exec()
        ft_costoflean = allcostoflean
    }
    if (ft_costofabode == 'all') {
        let allcostofabode = await Scholarship.distinct('costofabode').exec()
        ft_costofabode = allcostofabode
    }

    await Scholarship.find({
            stype: ft_stype,
            sfaculty: { $in: ft_facu },
            sbranch: { $in: ft_branch },
            university: ft_uni,
            sgpa: { $lte: ft_gpa },
            sclass: ft_sclass,
            country: ft_country,
            costoflive: ft_costoflive,
            costoflean: ft_costoflean,
            costofabode: ft_costofabode
        }).exec().then((doc) => {
            res.render('admins/resultfilter', { scholarships: doc })

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


// -api- ลบทุน
router.get('/delete/:id', (req, res) => {
    Scholarship.findByIdAndDelete(req.params.id).exec()
    res.redirect('/scholarships/list')
    console.log('deleted!!')
})


// -UI- เลือกแก้ไขข้อมูลทุน
router.post('/edit', (req, res) => {
    const edit_id = req.body.edit_id
    Scholarship.findOne({ _id: edit_id }).exec().then((doc, err) => {
        res.render('admins/editscholarship', { scholarships: doc })
    })
})


// -api- อัปเดทข้อมูล
router.post('/update', (req, res) => {
    const update_id = req.body.update_id
    let data = {
        sid: req.body.sid,
        sname: req.body.sname,
        stype: req.body.stype,
        opendate: req.body.opendate,
        closedate: req.body.closedate,
        sfaculty: req.body.sfaculty,
        sbranch: req.body.sbranch,
        sclass: req.body.sclass,
        sgpa: req.body.sgpa,
        country: req.body.country,
        university: req.body.university,
        costoflive: req.body.costoflive,
        costoflean: req.body.costoflean,
        costofabode: req.body.costofabode,
        stoeic: req.body.stoeic,
        sielts: req.body.sielts,
        stoefl: req.body.stoefl,
        sgiver: req.body.sgiver,
        url: req.body.url,
        scrapdate: req.body.scrapdate
    }
    Scholarship.findByIdAndUpdate(update_id, data).exec().then((err) => {
        res.redirect('/scholarships/list')
        console.log('Edited!!')
    })
})


// -api- ลบข้อมูลผู้ใช้
router.get('/users/delete/:id', (req, res) => { //delete
    User.findByIdAndDelete(req.params.id).exec()
    res.redirect('/scholarships/userlist')
    console.log('User deleted!!')
})


// -UI- แสดงรายการผู้ใช้
router.get('/userlist', (req, res) => {
    User.find().exec().then((doc, err) => {
        res.render('admins/userlist', { userdata: doc })
    })
})

router.get('/suserlist', (req, res) => {
    User.find().exec().then((doc, err) => {
        res.render('subadmins/suserlist', { userdata: doc })
    })
})


// -UI- ดูข้อมูลผู้ใช้
router.get('/thisuser/:id', (req, res) => {
    const this_id = req.params.id
    User.findOne({ _id: this_id }).exec().then((doc, err) => {
        console.log(doc)
        res.render('admins/thisuser', { userdata: doc })
    })
})


// -UI- ดูข้อมูลรายการทุน
router.get('/this/:id', (req, res) => {
    const this_id = req.params.id
    Scholarship.findOne({ _id: this_id }).exec().then((doc, err) => {
        console.log(doc)
        res.render('admins/thisscholarship', { scholarships: doc })
    })
})

//  mngfaculty ///////////////////////////////////////////////////////////////////////////////
router.get('/mngfaculty', async(req, res) => {
    let majordocs = await Major.find().exec()
    res.render('admins/addfaculty', { majordocs: majordocs })
})


//-api- เพิ่มข้อมูลคณะ
router.post('/addcompfaculty', async(req, res) => {
    let data = new Major({
        faculty: req.body.faculty,
        branch: []
    })
    statustext = ''
    let check = await Major.findOne({ faculty: data['faculty'] }).exec()
        // console.log(check)
    if (check != null) {
        res.send('this faculty is have !!')
        res.redirect('/scholarships/mngfaculty')
    } else {
        Major.savemajor(data);
        console.log('new faculty success!!')
        res.redirect('/scholarships/mngfaculty')
    }
})


//-api- ลบข้อมูลคณะ
router.post('/facultydelete', async(req, res) => { //delete
    let facultyname = await req.body.facultyname
    await Major.deleteOne({ faculty: facultyname })
    res.redirect('/scholarships/mngfaculty')
    console.log('faculty deleted!!')
})

router.post('/editfaculty', async(req, res) => {
    let facultyname = await req.body.paramss
    let data = {
        faculty: req.body.facultyedit
    }
    console.log(facultyname)
    console.log(data)
    await Major.findOneAndUpdate({ faculty: facultyname }, data).exec()
    console.log('edit success!')
    res.redirect('/scholarships/mngfaculty')
})


// -UI- เลือกสาขาที่จะลบ
router.post('/selectbranch', async(req, res) => {
    let selcter = await req.body.branchselect
    let faculty_list = await Major.findOne({ faculty: selcter }).distinct('branch').exec()
    console.log(faculty_list)
    if (faculty_list != '') {
        res.render('admins/deletebranch', { faculty_list: faculty_list, selcter: selcter })
    } else {
        res.send('this faculty not this branch')
    }
})


//  stype //////////////////////////////////////////////////////////////////////////////////////////////////
router.get('/mngtype', async(req, res) => {
    let listtype = await Type.distinct('scholarship_type').exec()
    res.render('admins/addtype', { listtype: listtype })
})


// -api- เพิ่มข้อมูลประเภททุน
router.post('/addcomptype', async(req, res) => {
    const id = '6448df9b06e8692cf6283779'
    let scholarship_type = await req.body.scholarship_type
    let compdoc = await Type.findOne({ _id: id, scholarship_type: scholarship_type }).exec()
    if (compdoc != null) {
        console.log('this type is have in database !!')
        res.redirect('/scholarships/mngtype')
    } else {
        await Type.updateOne({ _id: id }, { $push: { scholarship_type: scholarship_type } })
        console.log('Add type success !!!')
        res.redirect('/scholarships/mngtype')
    }
})


// edit stype
router.post('/edittype', async(req, res) => {
    const id = '6448df9b06e8692cf6283779'
    let scholarship_type = await req.body.scholarship_type
    let params = await req.body.params
    await Type.updateOne({ _id: id }, { $pull: { scholarship_type: params } })
    await Type.updateOne({ _id: id }, { $push: { scholarship_type: scholarship_type } })
    console.log('Edit success!')
    res.redirect('/scholarships/mngtype')
})


//-api- ลบข้อมูลประเภท
router.post('/typedelete', async(req, res) => { //delete
    let type_name = await req.body.nametype
    await Type.updateOne({ scholarship_type: type_name }, { $pull: { scholarship_type: type_name } })
    console.log(type_name)
    res.redirect('/scholarships/mngtype')
})


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// query branch
router.post('/getbranch', async(req, res) => {
    let faculty_name = await req.body.faculty_name
    console.log(faculty_name)
    let faculty_list = await Major.findOne({ faculty: faculty_name }).distinct('branch').exec()
    let majordoc = await Major.find().exec()
    let majordocs = await Major.find().exec()
    res.render('admins/addcomp', { faculty: majordoc, faculty_list: faculty_list, faculty_name: faculty_name })
})


router.get('/mngbranch', async(req, res) => {
    let query = req.query.faculty
        // console.log('----------------------------------------------------------')
        // console.log(query)
    let listbranch = await Major.find({ faculty: query }).distinct('branch').exec()
    let listfaculty = await Major.distinct('faculty').exec()
    res.render('admins/addbranch', { listbranch: listbranch, listfaculty: listfaculty, query: query })
})


// -api- เพิ่มข้อมูลสาขา
router.post('/branchdelete', async(req, res) => { //delete
    let faculty = await req.body.faculty
    console.log(faculty)
    let branch = await req.body.branch
        // console.log(branch)
    await Major.findOneAndUpdate({ faculty: faculty }, { $pull: { branch: branch } }).exec()
    let aa = await Major.find({ faculty: faculty }).exec()
    console.log(aa)
    let reurl = '/scholarships/mngbranch?faculty=' + faculty
        // console.log(reurl)
    res.redirect(reurl)
})

//-api- เพิ่มข้อมูลสาขา
router.post('/addcompbranch', async(req, res) => {
    let branch = await req.body.branch
    let faculty = await req.body.faculty
    let branchdoc = await Major.findOne({ faculty: faculty, branch: branch }).exec()
        // console.log(branchdoc)
        // console.log(branch)
        // console.log(faculty)
    if (branchdoc != null) {
        res.send('this data is have !!')
        console.log('This branch is have !!')
    } else {
        await Major.updateOne({ faculty: faculty }, { $push: { branch: branch } })
        console.log('Add new branch !!')
        let reurl = '/scholarships/mngbranch?faculty=' + faculty
        res.redirect(reurl)
    }
})

router.post('/edidbranch', async(req, res) => {
    let beforedit = await req.body.beforedit
    let edit = await req.body.editbranch
    let faculty = await req.body.faculty

    // console.log(beforedit)
    // console.log(edit)
    // console.log(faculty)

    await Major.findOneAndUpdate({ faculty: faculty }, { $pull: { branch: beforedit } }).exec()
    await Major.findOneAndUpdate({ faculty: faculty }, { $push: { branch: edit } }).exec()
    let reurl = '/scholarships/mngbranch?faculty=' + faculty
    res.redirect(reurl)
})

module.exports = router;