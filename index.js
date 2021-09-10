'use strict';
const multer  = require('multer')
const app = require('express')();
const passwordSecure = require('secure-random-password');
var fs = require('fs');
const http = require('http').Server(app);
const io = require('socket.io')(http,{
  cors:true,
  origins:["*"]
}
  );

  const cors = require('cors')
  app.use(cors({ origin: "*"}));

  const PORT = process.env.PORT || 3000;

  http.listen(PORT,(err) => {
    if (err) return;
    console.log(`Serveur lancé sur ${PORT}`);
  });

//mise en place de la connection mongoDB
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb+srv://eddytab:Okioku570.632.@eddytcluster.16t9t.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const maDB = 'reseauSocial';
const maCollectionUsers= 'user'
const maCollectionPhotoUsers= 'photoUser'
const maCollectioncommentairesMessage= 'commentairesMessage'
const maCollectionListeUsers= 'listeUser'
const maCollectionChats= 'chat'
const maCollectionDiscussions= 'historique'

// Inscription
function envoiMongoDB(donneesMongoDB,collectionMongoDB){

  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const mongoDB = client.db(maDB).collection(collectionMongoDB);
    
    mongoDB.insertOne(donneesMongoDB).then(
        MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
  
          const donnees = client.db(maDB).collection(maCollectionPhotoUsers);
          
  
          donnees.find({ pseudo : donneesMongoDB.pseudo}).toArray((err,datas) =>{
            mongoDB.updateOne(
              {pseudo: donneesMongoDB.pseudo},
              { $set: { photo: datas[0].buffer} }
            )
        })
        })
    )
  });
}
//envoi de la photo
function envoiMongoDBPhoto(donneesMongoDB,collectionMongoDB){

  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const mongoDB = client.db(maDB).collection(collectionMongoDB);
    
    mongoDB.insertOne(donneesMongoDB)
  });
}
//mettre à jour le mot de passe d'un utilisateur
function envoiMongoDBUpdatePassword(rechercheUserEmail,newpassword){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {email: rechercheUserEmail},
      { $set: { password: newpassword} }
    )
  });

}

//mise à jour de la BDD quand un utilisateur se log
function connexionSocket(socketId,pseudo){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo : pseudo},
      {$set: { socketId: socketId,connexion: true} }
    )
  });
}

//mise à jour de la BDD quand un utilisateur se déco
function deconnectionSocket(pseudo){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo : pseudo},
      {$set: { socketId:"",connexion: false} }
    )
  });
}

function deconnectionSocketID(socketId){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {socketId: socketId},
      {$set: { socketId:"",connexion: false} }
    )
  });
}

//mettre à jour la liste du demandeur de l'invitation
function envoiMongoDBDemendeurInvitation(pseudoDemendeur,pseudoReceveur){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo: pseudoDemendeur},
      {$push: { "listeUser.$[].listeAmisEnAttente": pseudoReceveur }}
    )
  });

}
//mettre à jour la liste du receveur de l'invitation
function envoiMongoDBReceveurInvitation(pseudoDemendeur,pseudoReceveur){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo: pseudoReceveur},
      {$push: { "listeUser.$[].listeAmisAttenteConf": pseudoDemendeur }}
    )
  });

}

//traitement de la reponse de l'invitation
function acceptationInvitationReceveur(dataDemandeurInvitation,pseudoReceveurInvitation){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo: pseudoReceveurInvitation},
      {$pull: { "listeUser.$[].listeAmisAttenteConf": dataDemandeurInvitation.pseudo }}
    ).then(
      donnees.updateOne(
        {pseudo: pseudoReceveurInvitation},
        {$pull: { "listeUser.$[].listeAmisEnAttente": dataDemandeurInvitation.pseudo }})
    ).then(
      donnees.updateOne(
        {pseudo: pseudoReceveurInvitation},
        {$push: { "listeUser.$[].listeAmisConfirmées": dataDemandeurInvitation.pseudo }})
    )
  });
}
function acceptationInvitationDemandeur(dataDemandeurInvitation,pseudoReceveurInvitation){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo: dataDemandeurInvitation.pseudo},
      {$pull: { "listeUser.$[].listeAmisAttenteConf": pseudoReceveurInvitation }}
    ).then(
      donnees.updateOne(
        {pseudo: dataDemandeurInvitation.pseudo},
        {$pull: { "listeUser.$[].listeAmisEnAttente": pseudoReceveurInvitation }})
    ).then(
      donnees.updateOne(
        {pseudo: dataDemandeurInvitation.pseudo},
        {$push: { "listeUser.$[].listeAmisConfirmées": pseudoReceveurInvitation }})
    )
  });
}

function ignoreInvitationReceveur(dataDemandeurInvitation,pseudoReceveurInvitation){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo: pseudoReceveurInvitation},
      {$pull: { "listeUser.$[].listeAmisAttenteConf": dataDemandeurInvitation.pseudo }}
    ).then(
      donnees.updateOne(
        {pseudo: pseudoReceveurInvitation},
        {$pull: { "listeUser.$[].listeAmisEnAttente": dataDemandeurInvitation.pseudo }})
    )
  });
}
function ignoreInvitationDemandeur(dataDemandeurInvitation,pseudoReceveurInvitation){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo: dataDemandeurInvitation.pseudo},
      {$pull: { "listeUser.$[].listeAmisAttenteConf": pseudoReceveurInvitation }}
    ).then(
      donnees.updateOne(
        {pseudo: dataDemandeurInvitation.pseudo},
        {$pull: { "listeUser.$[].listeAmisEnAttente": pseudoReceveurInvitation }})
    )
  });
}

//traitement de la recommandation
function recommandation(pseudoReceveur,pseudoRecommandation,pseudoOrigineRecommandation){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    
    donnees.updateOne(
      {pseudo: pseudoReceveur},
      {$push: { "listeUser.$[].listeAmisRecommandé": {pseudoRecommandation:pseudoRecommandation,pseudoOrigineRecommandation:pseudoOrigineRecommandation} }}
    )
  });
}


function RecommandationReceveur(dataReceveurInvitation,pseudoDemandeurInvitation){
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    donnees.updateOne(
      {pseudo: pseudoDemandeurInvitation},
      {$pull : {"listeUser.$[].listeAmisRecommandé" : {pseudoRecommandation:dataReceveurInvitation.pseudo,pseudoOrigineRecommandation:dataReceveurInvitation.pseudoOrigineRecommandation}}}
    )
  });
}
/** 
const plouf = 'knunt'
    function envoiMongoDBUpdate(){
      MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

        const donnees = client.db(maDB).collection(maCollection);
        
        donnees.updateOne(
          {pseudo: "eddyAdmin"},
          {$push: { "listeUser.$[].listeAmisConfirmées": plouf }}
        )
      });

}
    function envoiMongoDBUpdate(){
      MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

        const donnees = client.db(maDB).collection(maCollectionUsers);
        
        donnees.updateOne(
          {pseudo: "eddyAdmin"},
          {$push: { "listeUser.$[].listeAmisConfirmées": plouf }}
        )
      });

}
*/
/**
 * *************************************
 * ***************socket.io*************
 * *************************************
 */

let nombreConnexion = 0;
let rafraichDatas = [];
io.on("connection", socket => {
  console.log(socket.id)
  nombreConnexion++
  console.log('a user connected')
  io.emit('nombre connexion', nombreConnexion);
  socket.on('connexion', (data) =>{
    io.emit('nombre connexion', nombreConnexion);
  })

/** 
  fs.readFile(__dirname + `/uploads/${photoPseudo}.jpg`, function(err, buf){
    socket.emit('test event', { image: true, buffer: buf.toString('base64') });
    console.log('image file is initialized');
  });
*/

// *****inscription User******
// 1. Vérification des données (email,pseudo)


    socket.on('verif new user', (data) =>{
      let verif = {}
      MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
        const donnees = client.db(maDB).collection(maCollectionUsers);
        donnees.find({ pseudo : data.pseudo }).toArray((err,datas) => {
            if(datas[0] == undefined){
                verif.pseudo = true;
                MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
                  const user = client.db(maDB).collection(maCollectionUsers);
                  
                  user.find({ email : data.email }).toArray((err,datas) =>{
                    if(datas[0] == undefined){
                      verif.email = true
                      console.log(verif)
                    }
                   else{
                    verif.email = false
                    console.log(verif)
                  }
                  client.close()
                  socket.emit('reponse verif new user', verif);
                  })
                })
            }
            else{
              verif.pseudo = false;
              MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
                const user = client.db(maDB).collection(maCollectionUsers);
                
                user.find({ email : data.email }).toArray((err,datas) =>{
                  if(datas[0] == undefined){
                    verif.email = true
                    console.log(verif)
                  }
                  else{
                    verif.email = false
                    console.log(verif)
                  }
                  client.close()
                  socket.emit('reponse verif new user', verif);
                })
              })
            }
            client.close()
            
            
        })
    })
})

//2. envoi des données validées à mongoDB + envoi d'un mail de confirmation
    socket.on('new user', (data) =>{
      envoiMongoDB(data,maCollectionUsers)
      mail(data.email,data.pseudo),
      console.log('mail envoyé')
    })



//3.Connexion du joueur => vérification du pseudo et du mdp

socket.on('verif login user', (data) =>{
  let verif = {}
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
    const donnees = client.db(maDB).collection(maCollectionUsers);
    donnees.find({ pseudo : data.pseudo }).toArray((err,datas) => {
        if(datas[0] == undefined){
          verif.pseudo = false;
          socket.emit('reponse verif login user', verif);
        }
        else{
          verif.pseudo = true;
          if (datas[0].password === data.password){
            verif.password = true
            verif.datas = datas
            connexionSocket(socket.id,data.pseudo)
          }
          else{
            verif.password = false
          }
          socket.emit('reponse verif login user', verif);
          
        }
        client.close()  
    })
})
})

//4.Mot de passe oublié
socket.on('verif email user', (data) =>{
  let verif = {}
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
    const donnees = client.db(maDB).collection(maCollectionUsers);
    donnees.find({ email : data.email }).toArray((err,datas) => {
        if(datas[0] == undefined){
          verif.email = false;
          socket.emit('reponse verif email user', verif);
        }
        else{
          verif.email = true;
          const newpassword = passwordSecure.randomPassword({ length: 8})
          // update MongoDB
          envoiMongoDBUpdatePassword(datas[0].email,newpassword);
          resetPasswordMail(datas[0].email,datas[0].pseudo,newpassword);
          socket.emit('reponse verif email user', verif);
        }
        client.close()  
    })
})
})
/** 
// En cas de rafraichissement de la page mais que le user est log

socket.on("rafraichissement", (datas) =>{
  const donnees = {
    remoteAddress: socket.request.connection.remoteAddress,
    datas: datas
  }
  rafraichDatas.push(donnees)
  console.log(rafraichDatas)
})

socket.on("rafraichissement datas", (datas) =>{
  stockDatas.forEach( element =>{
    if ( element.remoteAddress == socket.request.connection.remoteAddress){
      socket.emit('reponse rafraichissement datas', element.datas);
    }
  })
})
*/

// *****recherche User******
// 1. afficher la liste des users qui ne sont pas des amis ou n'ont pas reçus d'invitations
socket.on('recherche user', (data) =>{
if(data){
  const liste = data.listeUserDemandeur
  const listeUser = liste.listeAmisConfirmées.concat(liste.listeAmisAttenteConf).concat(liste.listeAmisEnAttente);
  listeUser.push(data.pseudoDemandeur)

  console.log(listeUser);


  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

    const donnees = client.db(maDB).collection(maCollectionUsers);
    

    donnees.find({ pseudo : { $nin : listeUser}}).toArray((err,datas) =>{
  client.close()
  socket.emit('reponse recherche user', datas);
  })
  })
}
})

//2.Ajout dans la BDD de l'invitation en cours et de l'invitation en attente de confirmation
socket.on('invitation user', (data) =>{
  envoiMongoDBDemendeurInvitation(data.dateUserDemendeur,data.dataUser.pseudo)
  envoiMongoDBReceveurInvitation(data.dateUserDemendeur,data.dataUser.pseudo)

  mailInvitation(data.dataUser.email,data.dateUserDemendeur,data.dataUser.pseudo)
})

// 3. afficher la liste des users qui sont dans la liste des invitations envoyées en attente de confirmation receveur/demandeur
socket.on('recherche user invitation', (data) =>{
  if(data){
  
    console.log(data);
  
  
    MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
  
      const donnees = client.db(maDB).collection(maCollectionUsers);
      
  
      donnees.find({ pseudo : { $in : data}}).toArray((err,datas) =>{
    client.close()
    socket.emit('reponse recherche user invitation', datas);
    })
    })
  }
  })

  //4.traitement de la reponse de l'invitation
socket.on('invitation reponse', (data) =>{

  if(data.resInvitation === "Invitation acceptée"){
    acceptationInvitationReceveur(data.dataUserDemandeur,data.dataUseReceveur)
    acceptationInvitationDemandeur(data.dataUserDemandeur,data.dataUseReceveur)
  }
  else{
    ignoreInvitationReceveur(data.dataUserDemandeur,data.dataUseReceveur)
    ignoreInvitationDemandeur(data.dataUserDemandeur,data.dataUseReceveur)
  }
  
})

  //5.Envoyer une recommandation
  socket.on('recommandation', (data) =>{
    recommandation(data.userRecommandationReceveur.pseudo,data.userRecommandation.pseudo,data.userRecommandationDemandeur)
    mailRecommandation(data.userRecommandation.pseudo,data.userRecommandationDemandeur,data.userRecommandationReceveur.pseudo,data.userRecommandationReceveur.email)
  })

  //6.Afficher la liste des recommandations
  socket.on('recherche user recommandation', (data) =>{
    if(data){
    console.log(data)
    
      MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
    
        const donnees = client.db(maDB).collection(maCollectionUsers);
        
    
        donnees.find({ pseudo : { $in : data}}).toArray((err,datas) =>{
      client.close()
      socket.emit('reponse recherche user recommandation', datas);
      })
      })
    }
    })

    //7.Ajout dans la BDD de l'invitation de la recommandation
socket.on('invitation user recommandation', (data) =>{
  console.log()
  if(data.resInvitation === "Invitation envoyée"){
    console.log(data.dataUser.email,data.dataUserDemandeur,data.dataUser.pseudo)
  envoiMongoDBDemendeurInvitation(data.dataUserDemandeur,data.dataUser.pseudo)
  envoiMongoDBReceveurInvitation(data.dataUserDemandeur,data.dataUser.pseudo)
  RecommandationReceveur(data.dataUser,data.dataUserDemandeur)
  mailInvitation(data.dataUser.email,data.dataUserDemandeur,data.dataUser.pseudo)
  }
  else{
    RecommandationReceveur(data.dataUser,data.dataUserDemandeur)
  }
})

    //8.mettre à jour la liste des messages publics
    socket.on('messages publics', (data) =>{

      const id = passwordSecure.randomPassword({ length: 20})
      const post = data.post
      post.idMessage = id

      MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {

        const donnees = client.db(maDB).collection(maCollectionUsers);
        
        donnees.updateOne(
          {pseudo: post.profilDestination},
          {$push: { "messageProfil": post }}
        ).then(
          mailMessageProfil(post.pseudoCreation,data.mail,post.profilDestination),
          socket.emit('reponse messages publics', 'données update')
        )
      });
    })

      //9.mettre à jour la liste des commentaires
      socket.on('commentaire', (data) =>{    
          MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
    
            const donnees = client.db(maDB).collection(maCollectioncommentairesMessage);
            donnees.insertOne(data.commentaire).then(
              socket.emit('reponse commentaire', 'données insert')
            )
          });
      })

      socket.on('commentaire update', (data) =>{
        MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
          const donnees = client.db(maDB).collection(maCollectioncommentairesMessage);
          donnees.find({ idMessage : data }).toArray((err,datas) => {
            socket.emit('reponse commentaire update', datas);
            client.close()  
          })
      })
      })

//Actualisation dataUser
socket.on('updateDataUser', (data) =>{
  MongoClient.connect(url, { useUnifiedTopology: true }, (err,client) => {
    const donnees = client.db(maDB).collection(maCollectionUsers);
    donnees.find({ pseudo : data }).toArray((err,datas) => {
      socket.emit('reponse updateDataUser', datas);
      client.close()  
    })
})
})

//en cas de déconnexion d'un joueur
socket.on('deco user', (data) =>{
  deconnectionSocket(data[0].pseudo)
})
socket.on("disconnect", (reason) => {
  nombreConnexion--
  console.log('a user disconnect')
  console.log(socket.id)
  deconnectionSocketID(socket.id)
  io.emit('deconnexion',nombreConnexion)
})
});



/**
 * *************************************
 * ***************Multer*************
 * *************************************
 */
    /** ci-dessous c'est quand on veut upload le fichier directement dans le serveur
const storage = multer.diskStorage({
  destination: (req,file,callBack) =>{
    callBack(null,'uploads')
  },
  filename:(req,file,callBack) =>{
    callBack(null,`${photoPseudo}`)
  }
})
*/
//const upload = multer({ dest: 'uploads/' })
const memStorage = multer.memoryStorage();
let upload = multer({storage: memStorage})


app.post('/file',upload.single('file'),(req,res,next) =>{
  const file = req.file
  const pseudo = file.originalname
  const base64 = file.buffer
  const data = { pseudo: pseudo,buffer:base64}

  envoiMongoDBPhoto(data,maCollectionPhotoUsers)

  // console.log(data)
  if(!file){
    const error = new Error('No File')
    error.httpStatusCode = 400
    return next(error)
  }
  res.send('photo envoyée')
}
)










/**
 * *************************************
 * ***************send email*************
 * *************************************
 */



 const nodemailer = require('nodemailer');

 

//1.Inscription
 async function mail(mailuser,pseudoUser) {

const transporter = nodemailer.createTransport({
  port: 465,               // true for 465, false for other ports
  host: "smtp.gmail.com",
     auth: {
          user: 'reseau.social.ifocop2021@gmail.com',
          pass: 'ReseauSocial2021',
       },
  secure: true,
  });

  const mailData = {
    from: 'reseau.social.ifocop2021@gmail.com',  // sender address
      to: mailuser,   // list of receivers
      subject: `Confirmation de création du compte Reseau Social`,
      text: 'That was easy!',
      html: `<b>Hello ${pseudoUser},</b><br>Par le pésent mail nous vous confirmons votre inscription au site Réseau Social !!!</br>`,
    };


    transporter.sendMail(mailData, (err, info) => { 
      if(err) 
        return console.log(err) 
      else 
        console.log('succes :',info); 
   });

}

//2.Envoi d'un nouveau mot de passe
async function resetPasswordMail(mailuser,pseudoUser,newpassword) {

  const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: "smtp.gmail.com",
       auth: {
            user: 'reseau.social.ifocop2021@gmail.com',
            pass: 'ReseauSocial2021',
         },
    secure: true,
    });
  
    const mailData = {
      from: 'reseau.social.ifocop2021@gmail.com',  // sender address
        to: mailuser,   // list of receivers
        subject: `Envoi d'un nouveau MDP - Reseau Social`,
        text: 'That was easy!',
        html: `<b>Hello ${pseudoUser},</b>
        <br>Votre pseudo : ${pseudoUser}</br>
        <br>Votre mot de passe provisoire : ${newpassword} </br>
        <br>Vous pouvez changer votre mdp à tout moment sur votre profil</br>`,
      };
  
  
      transporter.sendMail(mailData, (err, info) => { 
        if(err) 
          return console.log(err) 
        else 
          console.log('succes :',info); 
     });
  
  }


  //3.Envoie d'un mail pour une invitation reçu
 async function mailInvitation(mailuser,pseudoUserDemandeur,pseudoReceveur) {

  const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: "smtp.gmail.com",
       auth: {
            user: 'reseau.social.ifocop2021@gmail.com',
            pass: 'ReseauSocial2021',
         },
    secure: true,
    });
  
    const mailData = {
      from: 'reseau.social.ifocop2021@gmail.com',  // sender address
        to: mailuser,   // list of receivers
        subject: `Invitation en attente de confirmation sur Reseau Social`,
        text: 'That was easy!',
        html: `<b>Hello ${pseudoReceveur},</b><br>Vous avez reçu une invitation en attente de confirmation de ${pseudoUserDemandeur} </br>
        <br>Veulliez vous connecter à votre compte afin de valider ou non l'invitation</br>`,
      };
  
  
      transporter.sendMail(mailData, (err, info) => { 
        if(err) 
          return console.log(err) 
        else 
          console.log('succes :',info); 
     });
  
  }

    //4.Envoie d'un mail pour une recommandation reçu
 async function mailRecommandation(pseudoUserRecommandation,pseudoDemandeur,pseudoReceveur,mailReceveur) {

  const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: "smtp.gmail.com",
       auth: {
            user: 'reseau.social.ifocop2021@gmail.com',
            pass: 'ReseauSocial2021',
         },
    secure: true,
    });
  
    const mailData = {
      from: 'reseau.social.ifocop2021@gmail.com',  // sender address
        to: mailReceveur,   // list of receivers
        subject: `Recommandation reçu sur Reseau Social`,
        text: 'That was easy!',
        html: `<b>Hello ${pseudoReceveur},</b><br>Vous avez reçu une recommandation d'ami de ${pseudoDemandeur} pour être ami avec ${pseudoUserRecommandation} </br>
        <br>Veulliez vous connecter à votre compte afin de lancer une invitation ou non</br>`,
      };
  
  
      transporter.sendMail(mailData, (err, info) => { 
        if(err) 
          return console.log(err) 
        else 
          console.log('succes :',info); 
     });
  
  }

      //4.Envoie d'un mail pour une recommandation reçu
 async function mailMessageProfil(pseudoUserMessage,mailReceveurMessageProfil,pseudoReceveurMessageProfil) {

  const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: "smtp.gmail.com",
       auth: {
            user: 'reseau.social.ifocop2021@gmail.com',
            pass: 'ReseauSocial2021',
         },
    secure: true,
    });
  
    const mailData = {
      from: 'reseau.social.ifocop2021@gmail.com',  // sender address
        to: mailReceveurMessageProfil,   // list of receivers
        subject: `Message reçu sur votre profil Reseau Social`,
        text: 'That was easy!',
        html: `<b>Hello ${pseudoReceveurMessageProfil},</b><br>${pseudoUserMessage} a publié un message sur votre profil </br>
        <br>Veulliez vous connecter à votre compte pour répondre au message</br>`,
      };
  
  
      transporter.sendMail(mailData, (err, info) => { 
        if(err) 
          return console.log(err) 
        else 
          console.log('succes :',info); 
     });
  
  }

  
