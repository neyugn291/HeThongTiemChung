import React, { useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Dùng MaterialCommunityIcons cho icon "eye"

const Login = ({navigation}) => {
  const [showPassword, setShowPassword] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={myStyles.container}>
      <View style={myStyles.card}>
        <Image
          source={require("../../assets/VNMA.png")}
          style={myStyles.logo}
          resizeMode="contain"
        />

        <Text style={myStyles.title}>Đăng nhập VNMA</Text>

        <TextInput
          style={myStyles.input}
          placeholder="Tên đăng nhập"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
        />

        <View style={myStyles.passwordContainer}>
          <TextInput
            style={myStyles.passwordInput}
            placeholder="Mật khẩu"
            placeholderTextColor="#999"
            secureTextEntry={showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={myStyles.loginBtn}>
          <Text style={myStyles.loginText}>Đăng nhập</Text>
        </TouchableOpacity>

        <Text style={myStyles.link}>Quên mật khẩu</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={myStyles.link}>Tạo tài khoản mới</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const myStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6a97a4",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "80%",
    backgroundColor: "#f8dad0",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    position: "relative",
    shadowColor: "#021b42",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 5,
  },
  logo: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.1,
    marginTop: "20",
    zIndex: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#174171",
    marginBottom: 20,
    zIndex: 1,
  },
  input: {
    width: "100%",
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
    zIndex: 1,
  },
  passwordContainer: {
    width: "100%",
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
    zIndex: 1,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    color: "#000",
  },
  loginBtn: {
    width: "100%",
    height: 45,
    backgroundColor: "#6a87a4",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
    zIndex: 1,
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  link: {
    color: "#174171",
    fontSize: 15,
    margin: 4,
    zIndex: 1,
  },
});

export default Login;
