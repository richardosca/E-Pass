create table users(
    id serial primary key,
    first_name varchar(35),
    last_name varchar(35),
    email varchar(35),
    hashed_password varchar(64),
    disabled boolean default false
);

create table user_roles(
    user_id integer,
    user_role varchar(16)
);

create table organisation_members(
    user_id integer,
    organisation_id integer
);

create table organisations(
    id serial primary key,
    name varchar(30)
);

create table gates(
    id serial primary key,
    name varchar(30),
    organisation_id integer,
    description varchar(150),
    officer_id integer,
    disabled boolean default false
);

create table passes(
    id serial primary key,
    inviting_user_id integer,
    invited_user_id integer,
    gate_id integer,
    _date timestamptz,
    organisation_id integer,
    inviting_user_name varchar(30),
    invited_user_email varchar(35)
);

create table gate_records(
    id serial primary key,
    visitor_id integer,
    authorizing_officer_id integer,
    vehicle_registration varchar(20),
    gate_id integer,
    luggage_description varchar(255),
    time_in timestamptz,
    time_out timestamptz,
    inviting_user integer,
    organisation_id integer
);

create table user_role_types(
    id serial primary key,
    role_name varchar(20)
);