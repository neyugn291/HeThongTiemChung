import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Apis, { endpoints } from "../../configs/Apis";

const AddAccount = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(true);
  const [showRepeatPassword, setShowRepeatPassword] = useState(true);
  const [user, setUser] = useState({
    email: "",
    username: "",
    password: "",
    confirm: "",
    first_name: "",
    last_name: "",
    is_superuser: false,
    is_staff: false,
    is_active: true,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const setState = (value, field) => {
    setUser({ ...user, [field]: value });
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

  const addAccount = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      setError(null);

      let form = new FormData();
      if (user.email) form.append("email", user.email);
      if (user.username) form.append("username", user.username);
      if (user.password) form.append("password", user.password);
      if (user.first_name) form.append("first_name", user.first_name);
      if (user.last_name) form.append("last_name", user.last_name);
      form.append("is_superuser", user.is_superuser ? "true" : "false");
      form.append("is_staff", user.is_staff ? "true" : "false");
      form.append("is_active", user.is_active ? "true" : "false");

      console.log("Dữ liệu gửi lên đăng ký:", {
        email: user.email,
        username: user.username,
        password: user.password,
        first_name: user.first_name,
        last_name: user.last_name,
        is_superuser: user.is_superuser,
        is_staff: user.is_staff,
        is_active: user.is_active,
      });

      const registerResponse = await Apis.post(endpoints["register"], form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (registerResponse.status === 201) {
        console.log("Đăng ký thành công, response:", registerResponse.data);
        Alert.alert("Thành công", "Tài khoản đã được tạo!");
        navigation.goBack({ refresh: true });
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
          else if (errors.non_field_errors) setError(errors.non_field_errors[0]);
          else setError("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!");
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm Tài Khoản</Text>
      </View>

      <View style={styles.content}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TextInput
          style={styles.input}
          placeholder="Họ"
          placeholderTextColor="#999"
          value={user.last_name}
          onChangeText={(text) => setState(text, "last_name")}
        />
        <TextInput
          style={styles.input}
          placeholder="Tên"
          placeholderTextColor="#999"
          value={user.first_name}
          onChangeText={(text) => setState(text, "first_name")}
        />
        <TextInput
          style={styles.input}
          placeholder="Email *"
          placeholderTextColor="#999"
          value={user.email}
          onChangeText={(text) => setState(text, "email")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Tên đăng nhập *"
          placeholderTextColor="#999"
          value={user.username}
          onChangeText={(text) => setState(text, "username")}
          autoCapitalize="none"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Mật khẩu *"
            placeholderTextColor="#999"
            secureTextEntry={showPassword}
            value={user.password}
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
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Xác nhận mật khẩu *"
            placeholderTextColor="#999"
            secureTextEntry={showRepeatPassword}
            value={user.confirm}
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

        <Text style={styles.label}>Phân quyền</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, user.is_superuser && styles.roleButtonSelected]}
            onPress={() => setState(!user.is_superuser, "is_superuser")}
          >
            <Text style={user.is_superuser ? styles.roleTextSelected : styles.roleText}>Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, user.is_staff && styles.roleButtonSelected]}
            onPress={() => setState(!user.is_staff, "is_staff")}
          >
            <Text style={user.is_staff ? styles.roleTextSelected : styles.roleText}>Nhân viên</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, !user.is_superuser && !user.is_staff && styles.roleButtonSelected]}
            onPress={() => {
              setState(false, "is_superuser");
              setState(false, "is_staff");
            }}
          >
            <Text style={!user.is_superuser && !user.is_staff ? styles.roleTextSelected : styles.roleText}>Người dùng</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.label}>Trạng thái hoạt động</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#0c5776" }}
            thumbColor={user.is_active ? "#fff" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={(value) => setState(value, "is_active")}
            value={user.is_active}
            style={styles.switch}
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={addAccount}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Đang xử lý..." : "Lưu"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6a97a4",
  },
  header: {
    height: 120,
    backgroundColor: "#0c5776",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    alignItems: "center",
    flexDirection: "row",
    zIndex: 1,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  backButton: {
    padding: 10,
    marginTop: 30,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 30,
    marginLeft: 5,
  },
  content: {
    padding: 16,
  },
  input: {
    backgroundColor: "#e0f2fe",
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 10,
    color: "#021b42",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  passwordInput: {
    flex: 1,
    height: 45,
    color: "#000",
  },
  saveButton: {
    backgroundColor: "#f8dad0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#021b42",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  roleButtonSelected: {
    backgroundColor: "#0c5776",
    borderColor: "#0c5776",
  },
  roleText: {
    fontSize: 14,
    color: "#333",
  },
  roleTextSelected: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], // Điều chỉnh kích thước Switch nếu cần
  },
});

export default AddAccount;