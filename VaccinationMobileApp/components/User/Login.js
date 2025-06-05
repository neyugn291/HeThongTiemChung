import React, { useState, useContext } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Apis, { authApis, endpoints } from "../../configs/Apis";
import { MyDispatchContext } from "../../configs/MyContexts";
import { useNavigation } from "@react-navigation/native";

const Login = () => {
  const [showPassword, setShowPassword] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
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
      // Chuẩn bị dữ liệu đăng nhập
      const loginData = {
        username,
        password,
        client_id: "agJuPMBypbKiY1K9PRpoWidY7pZRKj6tOZPLo6to",
        client_secret: "81Wqvd6EC8DiIGMQjLQm4jJV8vN8DEuXaDuHUKzXdlzXkOb3AUf9zDIIs4nv1ootwKcbKUUmIcnQGU00tLiPm7jl2QVnwvFw1be0DSdMm7haj22LqcLUKJL2tC1nFogv",
        grant_type: "password",
      };
      console.log("Dữ liệu gửi lành đăng nhập:", loginData);

      // Gửi yêu cầu đăng nhập
      const res = await Apis.post(endpoints["login"], loginData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        transformRequest: [(data) => {
          const params = new URLSearchParams();
          for (const key in data) {
            params.append(key, data[key]);
          }
          return params.toString();
        }],
      });
      
      console.log("Phản hồi đăng nhập:", res.data);

      // Lưu access_token vào AsyncStorage
      await AsyncStorage.setItem("token", res.data.access_token);

      // Lấy thông tin người dùng
      const userData = await authApis(res.data.access_token).get(endpoints["currentUser"]);
      console.log("Thông tin người dùng:", userData.data);

      // Dispatch trạng thái đăng nhập
      dispatch({
        type: "login",
        payload: userData.data,
      });

      // Kiểm tra is_superuser và is_staff để chuyển hướng
      if (userData.data.is_superuser === true) {
        navigation.replace("AdminHome");
      } else if (userData.data.is_staff === true) {
        navigation.replace("StaffHome");
      } else {
        navigation.replace("Home");
      }
    } catch (ex) {
      console.error("Lỗi chi tiết:", ex.response ? ex.response.data : ex.message);
      if (ex.response) {
        const errors = ex.response.data;
        if (errors.error === "unsupported_grant_type") {
          setError("Server không hỗ trợ phương thức đăng nhập này. Vui lòng kiểm tra cấu hình!");
        } else if (errors.error === "invalid_grant") {
          setError("Sai thông tin hoặc tài khoản không hoạt động!");
        } else if (errors.error === "invalid_client") {
          setError("Thông tin client không hợp lệ. Vui lòng kiểm tra client_id và client_secret!");
        } else if (errors.non_field_errors) {
          setError(errors.non_field_errors[0]);
        } else {
          setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!");
        }
      } else {
        setError("Không thể kết nối đến server. Vui lòng kiểm tra mạng!");
      }
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
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={myStyles.link}>Tạo tài khoản mới</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles remain unchanged
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
    backgroundColor: "#a0a0a0",
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