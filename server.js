const express = require('express')
const app = express()
const port = 3001
const cors = require('cors')

const db = require('knex')({
    client: 'pg',
    connection: {
        host: 'localhost',
        port: '5432',
        user: 'postgres',
        password: 'gato',
        database: 'saldb'
    }
})

const genRandomNumber = (lowerbound,upperbound) => {
    return lowerbound + Math.floor(Math.random() * (upperbound - lowerbound + 1))
}

const succesMsg = 'Éxito'
const errMsg = 'Algo salió mal'

app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use(cors())

app.post('/login',(req,res) => {
    let {username,password} = req.body

    db('usuarios')
        .where({nombre_de_usuario: username})
        .join('tipos_de_usuario','usuarios.tipo_de_usuario','=','tipos_de_usuario.id')
        .select('usuarios.id','usuarios.nombre','usuarios.apellido','usuarios.correo','nombre_de_usuario','usuarios.contrasena','tipos_de_usuario.tipo')
        .then(resp => {
            if(resp[0].contrasena === password){
                res.json(resp[0])
            }
            else{
                res.status(400).json('Credenciales inválidas')
            }
        }) 
        .catch(err => {
            res.status(400).json('Credenciales inválidas')
        })
})

app.post('/user-signup', (req,res) => {
    let {name,lastname,email,usertype} = req.body

    let newName = name.replace(' ', '').toLowerCase()
    let newLastname = lastname.replace(' ', '').toLowerCase()
    let username
    let password = ''

    newName = newName.replace(/á/g,'a')
    newName = newName.replace(/é/g,'e')
    newName = newName.replace(/í/g,'i') 
    newName = newName.replace(/ó/g,'o')
    newName = newName.replace(/ú/g,'u')
    newName = newName.replace(/ñ/g,'n')


    newLastname = newLastname.replace(/á/g,'a')
    newLastname = newLastname.replace(/é/g,'e')
    newLastname = newLastname.replace(/í/g,'i')
    newLastname = newLastname.replace(/ó/g,'o')
    newLastname = newLastname.replace(/ú/g,'u')
    newLastname = newLastname.replace(/ñ/g,'n')

    if(newName.length < 3){
        if(newLastname.length < 3){
            username = newName + newLastname
        }
        else{
            username = newName + newLastname.slice(0,3)
        }
    }
    else{
        if(newLastname.length < 3){
            username = newName.slice(0,3) + newLastname
        }
        else{
            username = newName.slice(0,3) + newLastname.slice(0,3)
        }
    }

    //48-57, 65-90 y 97-122
    while(password.length < 10){
        switch(genRandomNumber(0,2)){
            case 0:
                password += String.fromCharCode(genRandomNumber(48,57))
                break
            case 1:
                password += String.fromCharCode(genRandomNumber(65,90))
                break

            case 2:
                password += String.fromCharCode(genRandomNumber(97,122))
                break
        }
    }

    db('usuarios')
    .returning('*')
    .insert({
        nombre: name,
        apellido: lastname,
        correo: email,
        nombre_de_usuario: username,
        contrasena: password,
        tipo_de_usuario: usertype
    })
    .then(user => {
        res.json(user[0])
    })
    .catch(() => {
        res.status(400).json('Algo salió mal')
    })

})

app.post('/add-new-lab',(req,res) => {
    let {name,user} = req.body
    if(user == -1) user = null;

    db('laboratorios')
    .insert({
        nombre: name,
        disponibilidad: false,
        id_encargado: user
    })
    .then(() => {res.json('Éxito')})
    .catch(() => res.status(400).json('Algo salió mal'))
})

app.post('/modify-lab',(req,res) => {
    let {id,newName,disp} = req.body

    db('laboratorios')
    .returning('*')
    .where({id: id})
    .update({nombre: newName, disponibilidad: disp})
    .then(resp => {
        if(resp.length == 0) res.status(400).json(`Laboratorio con id ${id} no encontrado`)
        else res.json(resp[0])
    })
    .catch(() => res.status(400).json('Algo salió mal'))
})

//Asignar o verificar tipo de usuario
app.post('/assign-lab-manager',(req,res) => {
    let {labId,userId} = req.body
    if(userId == -1) userId = null

    db('laboratorios')
    .returning('id_encargado')
    .where('id','=',labId)
    .update({id_encargado: userId})
    .then(resp => {
        if(resp.length == 0) res.status(400).json(`Laboratorio con id ${labId} no encontrado`)
        else res.json(resp[0])
    })
    .catch(() => res.status(400).json('id de usuario incorrecta'))
})

app.post('/delete-lab',(req,res) => {
    let {labId} = req.body

    db('laboratorios')
    .where('id',labId)
    .del()
    .then(() => res.json('Éxito'))
    .catch(() => res.status(400).json('Algo salió mal'))
})

app.get('/get-labs',(req,res) => {
    db('laboratorios')
    .join('usuarios','laboratorios.id_encargado','=','usuarios.id')
    .select({
        nombre_laboratorio: 'laboratorios.nombre',
        nombre_encargado: 'usuarios.nombre',
        apellido_encargado: 'usuarios.apellido',
        correo_encargado: 'usuarios.correo'
    })
    .then(resp => res.json(resp))
    .catch(() => res.status(400).json('Algo salió mal'))
})

app.get('/get-users',(req,res) => {
    db('usuarios')
    .join('tipos_de_usuario','usuarios.tipo_de_usuario','=','tipos_de_usuario.id')
    .select('usuarios.nombre','usuarios.apellido','usuarios.correo','tipos_de_usuario.tipo')
    .then(resp => res.json(resp))
    .catch(() => res.status(400).json('Algo salió mal'))
})

app.post('/delete-user',(req,res) => {
    let {userId} = req.body

    db('usuarios')
    .where('id',userId)
    .del()
    .then(() => res.json('Éxito'))
    .catch(() => res.json(400).json('Algo salió mal'))
})

app.post('/modify-user',(req,res) => {
    let {userId,newName,newLastname,newEmail,newPassword,newUsername,newUsertype} = req.body

    db('usuarios')
    .returning('*')
    .where('id','=',userId)
    .update({
        nombre: newName,
        apellido: newLastname,
        correo: newEmail,
        nombre_de_usuario: newUsername,
        contrasena: newPassword,
        tipo_de_usuario: newUsertype
    })
    .then(resp => {res.json(resp)})
    .catch(() => res.status(400).json('Algo salió mal'))
})

app.post('/new-reservation',(req,res) => {
    let {reason,userId,labId,hours} = req.body

    let creationDate = new Date()
    creationDate = creationDate.toISOString().slice(0,11) + creationDate.getHours() + ':' + creationDate.getMinutes() + ':' + creationDate.getSeconds()

    db.transaction((trx) => {
        db('reservaciones')
        .returning('id')
        .insert({
            fecha_peticion: creationDate,
            completado: false,
            estado: 2,
            razon_solicitud: reason,
            id_docente: userId,
            id_laboratorio: labId
        })
        .then(reservationId => {
            hours.forEach(ob => {
                ob.id_reservacion = reservationId[0].id
                ob.id_laboratorio = labId
            })

            db('horas')
            .insert(hours)
            .then(trx.commit)
            .catch(trx.rollback)
        })
        .catch(trx.rollback)

    }) 
    .then(() => res.json(succesMsg))
    .catch(err => res.status(400).json(err))

})
app.post('/get-events',(req,res) => {
    let {idLab} = req.body

    db('horas').where({id_laboratorio: idLab})
    .select('*')
    .then(resp => {
        res.json(resp)
    })
    .catch(err => res.status(400).json(err))

})

app.post('/evaluate-reservation',(req,res) => {
    let {newStatus,reservationId,msg} = req.body

    db('reservaciones').where({id: reservationId})
    .update({estado: newStatus,motivo_rechazo: msg})
    .then(() => res.json(succesMsg))
    .catch(err => res.status(400).json(errMsg))

})

app.get('/get-report-data',(req,res) => {
    db('horas')
    .join('reservaciones','reservaciones.id','=','horas.id_reservacion')
    .select({
        id_hora: 'horas.id',
        hora_inicio: 'horas.inicio',
        hora_fin: 'horas.final',
        id_reservacion: 'reservaciones.id',
        id_laboratorio: 'reservaciones.id_laboratorio',
        fecha_peticion: 'reservaciones.fecha_peticion',
        completado: 'reservaciones.completado',
        estado: 'reservaciones.estado',
        razon_solicitud: 'reservaciones.razon_solicitud',
        motivo_rechazo: 'reservaciones.motivo_rechazo',
        id_docente: 'reservaciones.id_docente'
    })
    .then(resp => {
        res.json(resp)
    })
    .catch(err => res.status.json(errMsg))
})

app.post('/switch-lab-status',(req,res) => {
    let {status,labId} = req.body

    db('laboratorios').where({id: labId})
    .update({disponibilidad: status})
    .then(() => res.json(succesMsg))
    .catch(err => res.status(400).json(errMsg))
})

app.post('/cancel-reservation',(req,res) => {
    let {reservationId} = req.body

    db('reservaciones')
    .where({id: reservationId})
    .update({estado: 0})
    .then(() => res.json(succesMsg))
    .catch(err => res.status(400).json(err))
})

app.listen(port, () => {
    console.log(`Listening to port ${port}`)
})