import React, { useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Dùng MaterialCommunityIcons cho icon "eye" và "camera"

const Register = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(true);
  const [showRepeatPassword, setShowRepeatPassword] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [avatar, setAvatar] = useState(null); // State để lưu ảnh đại diện

  // Hàm xử lý chọn ảnh (cần tích hợp thư viện như react-native-image-picker)
  const handleChooseAvatar = () => {
    // Logic chọn ảnh (ví dụ: sử dụng react-native-image-picker)
    // setAvatar(selectedImage);
  };

  return (
    <View style={myStyles.container}>
      <View style={myStyles.card}>
        <Image
          source={require("../../assets/VNMA.png")}
          style={myStyles.logo}
          resizeMode="contain"
        />

        <Text style={myStyles.title}>Đăng ký VNMA</Text>

        <TouchableOpacity onPress={handleChooseAvatar} style={myStyles.avatarContainer}>
          <Icon
            name="camera"
            size={30}
            color="#999"
          />
          <Text style={myStyles.avatarText}>Chọn ảnh đại diện</Text>
        </TouchableOpacity>

        <TextInput
          style={myStyles.input}
          placeholder="Email hoặc số điện thoại"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
        />

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

        <View style={myStyles.passwordContainer}>
          <TextInput
            style={myStyles.passwordInput}
            placeholder="Xác nhận mật khẩu"
            placeholderTextColor="#999"
            secureTextEntry={showRepeatPassword}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
          />
          <TouchableOpacity onPress={() => setShowRepeatPassword(!showRepeatPassword)}>
            <Icon
              name={showRepeatPassword ? "eye-off" : "eye"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={myStyles.loginBtn}>
          <Text style={myStyles.loginText}>Đăng ký</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={myStyles.link}>Đã có tài khoản? Đăng nhập</Text>
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
  avatarContainer: {
    width: "100%",
    height: 60,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
    zIndex: 1,
    justifyContent: "center",
  },
  avatarText: {
    marginLeft: 10,
    color: "#999",
    fontSize: 16,
  },
});

export default Register;