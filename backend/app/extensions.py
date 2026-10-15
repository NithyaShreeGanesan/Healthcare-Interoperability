"""Flask extension instances initialized here for app factory pattern."""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db: SQLAlchemy = SQLAlchemy()
jwt: JWTManager = JWTManager()
cors: CORS = CORS()
