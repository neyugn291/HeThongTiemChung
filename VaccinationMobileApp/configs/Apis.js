import axios from "axios"

const BASE_URL = 'http://127.0.0.1:8000'

const endpoints = {
    'register': '/users/',
    'login': '/o/token/',
    'current-user': '/users/current-user/'
}

export default axios.create({
    baseURL: BASE_URL
})