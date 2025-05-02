import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
// import MyStyles from "../../styles/MyStyles";
// import { useState } from "react";
// import * as ImagePicker from 'expo-image-picker';
// import Apis, { endpoints } from "../../configs/Apis";
// import { useNavigation } from "@react-navigation/native";

const Register = () => {
//     const info = [{
//         label: "Tên",
//         field: "first_name",
//         secureTextEntry: false,
//         icon: "text"
//     }, {
//         label: "Họ và tên lót",
//         field: "last_name",
//         secureTextEntry: false,
//         icon: "text"
//     }, {
//         label: "Tên đăng nhập",
//         field: "username",
//         secureTextEntry: false,
//         icon: "text"
//     }, {
//         label: "Mật khẩu",
//         field: "password",
//         secureTextEntry: true,
//         icon: "eye"
//     }, {
//         label: "Xác nhận mật khẩu",
//         field: "confirm",
//         secureTextEntry: true,
//         icon: "eye"
//     }];

//     const [user, setUser] = useState({});
//     const [msg, setMsg] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const nav = useNavigation();

//     const setState = (value, field) => {
//         setUser({...user, [field]: value});
//     }

//     const pick = async () => {
//         let { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

//         if (status !== 'granted') {
//             alert("Permissions denied!");
//         } else {
//             const result = await ImagePicker.launchImageLibraryAsync();

//             if (!result.canceled) {
//                 setState(result.assets[0], "avatar");
//             }
//         }
//     }

//     const validate = () => {
//         for (let i of info)
//             if (!(i.field in user)  || user[i.field] === '') {
//                 setMsg(`Vui lòng nhập ${i.label}!`);
//                 return false;
//             }

//         if (user.password !== user.confirm) {
//             setMsg("Mật khẩu không khớp!");
//             return false;
//         }

//         return true;
//     }

//     const register = async () => {
//         if (validate() === true) {
//             try {
//                 setLoading(true);

//                 let form = new FormData();
//                 for (let key in user)
//                     if (key !== 'confirm') {
//                         if (key === 'avatar') {
//                             form.append(key, {
//                                 uri: user.avatar.uri,
//                                 name: user.avatar.fileName,
//                                 type: user.avatar.type
//                             })
//                         } else
//                             form.append(key, user[key]);
//                     }

//                 await Apis.post(endpoints['register'], form, {
//                     headers: {
//                         'Content-Type': 'multipart/form-data'
//                     }
//                 });
//                 nav.navigate('login');
//             } catch(ex) {
//                 console.error(ex);
//             } finally {
//                 setLoading(false);
//             }
//         }
//     }

    return (
        <ScrollView>
            <Text variant="titleLarge">Đăng ký</Text>
            {/* Thêm các TextInput và Button ở đây */}
        </ScrollView>
    );}


export default Register;