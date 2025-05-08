import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Apis, { authApis, endpoints } from "../../configs/Apis";
import { MyDispatchContext } from "../../configs/MyContexts";
import { useNavigation } from "@react-navigation/native";

const Register = () => {
  const [showPassword, setShowPassword] = useState(true);
  const [showRepeatPassword, setShowRepeatPassword] = useState(true);
  const [user, setUser] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useContext(MyDispatchContext);
  const navigation = useNavigation();

  const setState = (value, field) => {
    setUser({ ...user, [field]: value });
  };

  const handleChooseAvatar = async () => {
    let { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Quyền truy cập thư viện ảnh bị từ chối!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setState(result.assets[0], "avatar");
    }
  };

  const validate = () => {
    const requiredFields = ["email", "username", "password", "confirm"];
    for (let field of requiredFields) {
      if (!(field in user) || user[field] === "") {
        setError(
          `Vui lòng nhập ${
            field === "confirm" ? "xác nhận mật khẩu" : field
          }!`
        );
        return false;
      }
    }

    if (user.password !== user.confirm) {
      setError("Mật khẩu không khớp!");
      return false;
    }

    return true;
  };

  const register = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      setError(null);

      // Bước 1: Đăng ký người dùng
      let form = new FormData();
      if (user.email) form.append("email", user.email);
      if (user.username) form.append("username", user.username);
      if (user.password) form.append("password", user.password);
      if (user.avatar) {
        form.append("avatar", {
          uri: user.avatar.uri,
          name: user.avatar.fileName || `avatar_${Date.now()}.jpg`,
          type: user.avatar.type || "image/jpeg",
        });
      }
      console.log("Dữ liệu gửi lên đăng ký:", {
        email: user.email,
        username: user.username,
        password: user.password,
        hasAvatar: !!user.avatar,
      });

      const registerResponse = await Apis.post(endpoints["register"], form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (registerResponse.status === 201) {
        console.log("Đăng ký thành công, response:", registerResponse.data);

        // Bước 2: Đăng nhập để lấy access_token
        const loginData = {
          username: user.username,
          password: user.password,
          client_id: "kbP5vbxNIe2vbVsyK5PixaXpKRK1VPYhZTIBlwup",
          client_secret:
            "UEJSsQzXfz1ATwjuLJuQ0euJnBetLBU1BM6EfOtq5kGxSxPdAsMsx3j82YZGgQ7uTkpgianw2yMuUQpf3SlTKdG4BIYRRDIWJV5em453LDgkhmhBFfVJCSKLveiT1tKK",
          grant_type: "password",
        };
        console.log("Dữ liệu gửi lên đăng nhập:", loginData);

        // Gửi yêu cầu đăng nhập
        const loginResponse = await Apis.post(endpoints["login"], loginData, {
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

        console.log("Đăng nhập response:", loginResponse.data);

        const accessToken = loginResponse.data.access_token;
        await AsyncStorage.setItem("token", accessToken);

        // Bước 3: Lấy thông tin người dùng
        const userData = await authApis(accessToken).get(
          endpoints["currentUser"]
        );
        console.log("Thông tin người dùng:", userData.data);

        // Bước 4: Dispatch trạng thái đăng nhập
        dispatch({
          type: "login",
          payload: userData.data,
        });

        Alert.alert("Thành công", "Đăng ký và đăng nhập thành công!");
        // Chuyển hướng đến Home
        navigation.replace("Home");
      } else {
        throw new Error("Đăng ký thất bại");
      }
    } catch (ex) {
      console.error("Lỗi chi tiết:", ex.response ? ex.response.data : ex.message);
      if (ex.response) {
        if (ex.response.status === 400) {
          const errors = ex.response.data;
          if (errors.email) setError(errors.email[0]);
          else if (errors.username) setError(errors.username[0]);
          else if (errors.password) setError(errors.password[0]);
          else if (errors.error === "unsupported_grant_type") {
            setError("Đăng ký thành công, nhưng không thể đăng nhập tự động. Vui lòng đăng nhập thủ công!");
            navigation.navigate("Login");
          } else if (errors.error === "invalid_grant") {
            setError("Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại!");
          } else if (errors.error === "invalid_client") {
            setError("Thông tin client không hợp lệ. Vui lòng kiểm tra client_id và client_secret!");
          } else if (errors.non_field_errors) {
            setError(errors.non_field_errors[0]);
          } else {
            setError("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!");
          }
          console.log("Toàn bộ lỗi:", errors);
        } else {
          setError(`Đã xảy ra lỗi (mã ${ex.response.status}). Vui lòng thử lại!`);
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
        <Text style={myStyles.title}>Đăng ký VNMA</Text>
        {error && <Text style={myStyles.errorText}>{error}</Text>}
        <TouchableOpacity onPress={handleChooseAvatar} style={myStyles.avatarCircle}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar.uri }} style={myStyles.avatarImage} />
          ) : (
            <Icon name="camera" size={30} color="#999" />
          )}
        </TouchableOpacity>
        <TextInput
          style={myStyles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={user.email || ""}
          onChangeText={(text) => setState(text, "email")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={myStyles.input}
          placeholder="Tên đăng nhập"
          placeholderTextColor="#999"
          value={user.username || ""}
          onChangeText={(text) => setState(text, "username")}
          autoCapitalize="none"
        />
        <View style={myStyles.passwordContainer}>
          <TextInput
            style={myStyles.passwordInput}
            placeholder="Mật khẩu"
            placeholderTextColor="#999"
            secureTextEntry={showPassword}
            value={user.password || ""}
            onChangeText={(text) => setState(text, "password")}
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
            value={user.confirm || ""}
            onChangeText={(text) => setState(text, "confirm")}
          />
          <TouchableOpacity
            onPress={() => setShowRepeatPassword(!showRepeatPassword)}
          >
            <Icon
              name={showRepeatPassword ? "eye-off" : "eye"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={myStyles.loginBtn}
          onPress={register}
          disabled={loading}
        >
          <Text style={myStyles.loginText}>
            {loading ? "Đang xử lý..." : "Đăng ký"}
          </Text>
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
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    zIndex: 1,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    zIndex: 1,
  },
});

export default Register;