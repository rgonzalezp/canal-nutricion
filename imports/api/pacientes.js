import {
    Meteor
} from 'meteor/meteor';
import {
    Mongo
} from 'meteor/mongo';
import {
    check
} from 'meteor/check';
import {
    Match
} from 'meteor/check';

const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');

export const Pacientes = new Mongo.Collection('pacientes');


if (Meteor.isServer) {
    console. log("ENTRA COMO SERVER", process.env.CODE_CRYPTR);
    const cryptr = new Cryptr(process.env.CODE_CRYPTR);

    Meteor.publish('pacientes', function pacientesPublication(token) {

        let usuario = decodificarToken(token);

        if (usuario) {
            if (usuario.rol === "doctor") {
                return Pacientes.find({
                    $or: [{
                        doctor: usuario.identificacion
                    }, ],
                });
            } else {
                return pacientes.find();
            }
        } else {
            throw new Meteor.Error("Debes haber iniciado sesión para acceder a esta funcionalidad.");
        }
    });
}

Meteor.methods({
    'pacientes.buscarPaciente'({
        identificacion
    }) {
        check(identificacion, String);

        const paciente = Pacientes.findOne({
            identificacion: identificacion
        });
        return paciente;
    },
    'pacientes.validarPaciente'({
        correo,
        clave
    }) {
        check(correo, String);
        check(clave, String);

        let paciente = null;

        paciente = Pacientes.findOne({
            correo: correo
        });

        if (!paciente) {
            throw new Meteor.Error('No existe un usuario con ese correo.');
        } else {
            if (cryptr.decrypt(paciente.clave) !== clave) {
                throw new Meteor.Error('La contraseña ingresada no es correcta.');
            }
        }

        delete paciente.clave;

        let token = jwt.sign(paciente, process.env.CODE_TOKEN);

        return token;
    },
    'pacientes.insertarMedicamentos'({
        idPaciente,
        nuevoMedicamento,
        usuario
    }) {
        check(idPaciente, String);
        check(nuevoMedicamento, Object);
        check(usuario, Object);

        verificarPermisos(usuario.rol);

        const paciente = Pacientes.findOne({
            idPaciente: idPaciente
        });

        verificarExistenciaPaciente(paciente);
        let fecha = moment().format('DD/MM/YYYY - h:mm:ss a');

        try {
            Pacientes.update({
                idPaciente: idPaciente
            }, { $addToSet: { medicamentosAsignados: {
                id: nuevoMedicamento._id, 
                medicamento: nuevoMedicamento.medicamento,
                posologia: nuevoMedicamento.posologia,
                frecuencia: nuevoMedicamento.frecuencia,
                cantidad: nuevoMedicamento.cantidad,
                via: nuevoMedicamento.via,
                fechaInicio: fecha
               }}}
            );

            return "El medicamento " + nuevoMedicamento.nombre + " se actualizó correctamente";
        } catch (error) {
            throw new Meteor.Error(error);
        }
    }
});

function decodificarToken(token) {
    return token ? jwt.verify(token, process.env.CODE_TOKEN) : null;
}

function verificarPermisos(rol) {
    if (rol !== "doctor") {
        throw new Meteor.Error('No se encuentra autorizado para realizar esta acción');
    }
}

function verificarExistenciaPaciente(paciente) {
    if (!paciente) {
        throw new Meteor.Error('No se encuentra el paciente.');
    }
}