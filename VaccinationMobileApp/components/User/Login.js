import React, { useState, useContext } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Apis, { authApis, endpoints } from "../../configs/Apis"; // Giả sử bạn đã có cấu hình API
import { MyDispatchContext } from "../../configs/MyContexts"; // Context để dispatch trạng thái đăng nhập
import { useNavigation } from "@react-navigation/native";

const Login = () => {
  const [showPassword, setShowPassword] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null); // Thông báo lỗi
  const [loading, setLoading] = useState(false); // Trạng thái tải
  const dispatch = useContext(MyDispatchContext);
  const navigation = useNavigation();

  // Kiểm tra dữ liệu đầu vào
  const validate = () => {
    if (!username) {
      setError("Vui lòng nhập tên đăng nhập!");
      return false;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu!");
      return false;
    }
    return true;
  };

  // Hàm xử lý đăng nhập
  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      // Gửi yêu cầu đăng nhập tới endpoint OAuth2
      const res = await Apis.post(endpoints["login"], {
        username,
        password,
        client_id: "kcsDgyInFIBjIlb3evqzpyNFJ59gCNtdNqnpbqDY",
        client_secret: "jvYbMZ8XQ9nxn8mZc7FDiVb8JFWFxuzYQHdYdp5yqhun7gux705RCR0lScOfiUgDY8thrtJV5d5Rk3QdDKXGfwk3xLECgACUxdHAfEM5KdGSXQhUQMkftOeldAULJXAE",
        grant_type: "password",
      });

      // Lưu access_token vào AsyncStorage
      await AsyncStorage.setItem("token", res.data.access_token);

      // Lấy thông tin người dùng
      const userData = await authApis(res.data.access_token).get(
        endpoints["currentUser"]
      );

      // Dispatch trạng thái đăng nhập
      dispatch({
        type: "login",
        payload: userData.data,
      });

      // Điều hướng tới màn hình home
      navigation.navigate("Home");
    } catch (ex) {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={myStyles.container}>
      <View style={myStyles.card}>
        <Image
          source={require("../../assets/VNMA.png")}
          style={myStyles.logo}
          resizeMode="contain"
        />

        <Text style={myStyles.title}>Đăng nhập VNMA</Text>

        {error && <Text style={myStyles.errorText}>{error}</Text>}

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

        <TouchableOpacity
          style={[myStyles.loginBtn, loading && myStyles.disabledBtn]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={myStyles.loginText}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Text>
        </TouchableOpacity>

        <Text style={myStyles.link}>Quên mật khẩu</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
        >
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
  disabledBtn: {
    backgroundColor: "#a0a0a0", // Màu khi nút bị vô hiệu hóa
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
  errorText: {
    color: "red",
    fontSize: 14,
    marginBottom: 10,
    zIndex: 1,
  },
});

export default Login;