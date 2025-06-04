import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  StyleSheet,
  Switch,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const EditAccount = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    last_name: "",
    first_name: "",
    email: "",
    username: "",
    password: "",
    confirm: "",
    is_superuser: false,
    is_staff: false,
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(true);
  const [showRepeatPassword, setShowRepeatPassword] = useState(true);

  useEffect(() => {
    console.log("Route params in EditAccountScreen:", route.params);
    if (route.params?.user) {
      const user = route.params.user;
      console.log("User data from route.params:", user);

      const updatedFormData = {
        last_name: user.last_name || "",
        first_name: user.first_name || "",
        email: user.email || "",
        username: user.username || "",
        password: "", // Để trống vì không có mật khẩu hiện tại từ API
        confirm: "", // Để trống vì không có xác nhận mật khẩu hiện tại
        is_superuser: user.is_superuser || false,
        is_staff: user.is_staff || false,
        is_active: user.is_active || true,
      };
      setFormData(updatedFormData);
      console.log("Updated formData:", updatedFormData);
    } else {
      console.log("No user data found in route.params");
      Alert.alert("Lỗi", "Không tìm thấy dữ liệu người dùng để chỉnh sửa.");
    }
    setLoading(false);
  }, [route.params?.user]);

  const setState = (value, field) => {
    setFormData({ ...formData, [field]: value });
  };

  const validate = () => {
    const requiredFields = ["email", "username"];
    for (let field of requiredFields) {
      if (!(field in formData) || formData[field] === "") {
        Alert.alert("Lỗi", `Vui lòng nhập ${field}!`);
        return false;
      }
    }

    if (formData.password !== formData.confirm && (formData.password || formData.confirm)) {
      Alert.alert("Lỗi", "Mật khẩu không khớp!");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const formDataToSend = new FormData();

      if (formData.last_name) formDataToSend.append("last_name", formData.last_name);
      if (formData.first_name) formDataToSend.append("first_name", formData.first_name);
      if (formData.email) formDataToSend.append("email", formData.email);
      if (formData.username) formDataToSend.append("username", formData.username);
      if (formData.password) formDataToSend.append("password", formData.password);
      formDataToSend.append("is_superuser", formData.is_superuser ? "true" : "false");
      formDataToSend.append("is_staff", formData.is_staff ? "true" : "false");
      formDataToSend.append("is_active", formData.is_active ? "true" : "false");

      console.log("Sending form data:", formDataToSend);

      const response = await authApis(token).patch(endpoints["user"](route.params.user.id), formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("API Response:", response.data);

      Alert.alert("Thành công", "Cập nhật thông tin thành công!");
      navigation.goBack({ refresh: true });
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Đã có lỗi xảy ra.";
      Alert.alert("Lỗi", errorMessage);
      console.error("Error during submission:", error.response?.data || error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh Sửa Tài Khoản</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Họ và tên đệm</Text>
        <TextInput
          style={styles.input}
          value={formData.last_name}
          onChangeText={(text) => setState(text, "last_name")}
          placeholder="Ví dụ: Nguyễn Văn"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Tên</Text>
        <TextInput
          style={styles.input}
          value={formData.first_name}
          onChangeText={(text) => setState(text, "first_name")}
          placeholder="Ví dụ: A"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => setState(text, "email")}
          placeholder="Ví dụ: nguyenvana@gmail.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Tên đăng nhập *</Text>
        <TextInput
          style={styles.input}
          value={formData.username}
          onChangeText={(text) => setState(text, "username")}
          placeholder="Ví dụ: user123"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Mật khẩu (để trống nếu không đổi)</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Mật khẩu mới"
            placeholderTextColor="#999"
            secureTextEntry={showPassword}
            value={formData.password}
            onChangeText={(text) => setState(text, "password")}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialCommunityIcons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Xác nhận mật khẩu (nếu đổi)</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Xác nhận mật khẩu"
            placeholderTextColor="#999"
            secureTextEntry={showRepeatPassword}
            value={formData.confirm}
            onChangeText={(text) => setState(text, "confirm")}
          />
          <TouchableOpacity onPress={() => setShowRepeatPassword(!showRepeatPassword)}>
            <MaterialCommunityIcons
              name={showRepeatPassword ? "eye-off" : "eye"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {/* Phân quyền */}
        <Text style={styles.label}>Phân quyền</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, formData.is_superuser && styles.roleButtonSelected]}
            onPress={() => setState(!formData.is_superuser, "is_superuser")}
          >
            <Text style={formData.is_superuser ? styles.roleTextSelected : styles.roleText}>Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, formData.is_staff && styles.roleButtonSelected]}
            onPress={() => setState(!formData.is_staff, "is_staff")}
          >
            <Text style={formData.is_staff ? styles.roleTextSelected : styles.roleText}>Nhân viên</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, !formData.is_superuser && !formData.is_staff && styles.roleButtonSelected]}
            onPress={() => {
              setState(false, "is_superuser");
              setState(false, "is_staff");
            }}
          >
            <Text style={!formData.is_superuser && !formData.is_staff ? styles.roleTextSelected : styles.roleText}>Người dùng</Text>
          </TouchableOpacity>
        </View>

        {/* Trạng thái hoạt động với Switch ngang hàng */}
        <View style={styles.toggleContainer}>
          <Text style={styles.label}>Trạng thái hoạt động</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#0c5776" }}
            thumbColor={formData.is_active ? "#fff" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={(value) => setState(value, "is_active")}
            value={formData.is_active}
            style={styles.switch}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
          <Text style={styles.saveButtonText}>Lưu</Text>
        </TouchableOpacity>
      </ScrollView>
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
  label: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
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
    color: "#021b42",
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
  loadingText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
  },
});

export default EditAccount;