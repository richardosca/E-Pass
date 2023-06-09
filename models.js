const UserRoleTypes ={
    ADMIN:"ADMIN",
    MANAGEMENT:"MANAGEMENT",
    SECURITY:"SECURITY",
    VISITOR:"VISITOR"
}

//constructor for user
/**
 * @param {Number} id
 * @param {Number} organisation_id
 * @param {String} first_name
 * @param {String} last_name
 * @param {String} email
 * @return user
 */
const User = (id, organisation_id, first_name, last_name, email)=>{
    return{
        id,
        organisation_id,
        first_name,
        last_name,
        user_role,
        email
    };
}

module.exports = {User, UserRoleTypes};