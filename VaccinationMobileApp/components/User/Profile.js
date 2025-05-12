import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  Alert,
  StyleSheet,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import Styles from "../../components/Home/Styles";
import { Picker } from "@react-native-picker/picker";

// Danh sách tháng bằng tiếng Việt
const vietnameseMonths = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const Profile = ({ navigation, route }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    last_name: "",
    first_name: "",
    phone_number: "",
    email: "",
    citizen_id: "",
    birth_date: "",
    gender: "",
    avatar: null,
  });
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("Vui lòng đăng nhập lại!");
        const response = await authApis(token).get(endpoints["currentUser"]);
        const data = response.data;
        setUserData(data);
        const birthDate = data.birth_date || "";
        setFormData({
          last_name: data.last_name || "",
          first_name: data.first_name || "",
          phone_number: data.phone_number || "",
          email: data.email || "",
          citizen_id: data.citizen_id || "",
          birth_date: birthDate,
          gender: data.gender || "",
          avatar: data.avatar ? { uri: data.avatar } : null,
        });
        if (birthDate) {
          const [year, month, day] = birthDate.split("-");
          setSelectedYear(year || "");
          setSelectedMonth(month || "");
          setSelectedDay(day || "");
        }
      } catch (error) {
        Alert.alert("Lỗi", "Không thể tải thông tin người dùng.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setFormData({ ...formData, avatar: result.assets[0] });
    }
  };

  const handleDayMonthYearChange = () => {
    if (selectedDay && selectedMonth && selectedYear) {
      const formattedBirthDate = `${selectedYear}-${selectedMonth}-${selectedDay}`;
      setFormData({
        ...formData,
        birth_date: formattedBirthDate,
      });
    } else {
      setFormData({
        ...formData,
        birth_date: "",
      });
    }
  };

  useEffect(() => {
    handleDayMonthYearChange();
  }, [selectedDay, selectedMonth, selectedYear]);

  const validateDate = (day, month, year) => {
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!day || !month || !year) {
      return { isValid: false, error: "Vui lòng chọn đầy đủ ngày, tháng, năm." };
    }

    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
      return { isValid: false, error: "Ngày, tháng, năm phải là số hợp lệ." };
    }

    const today = new Date();
    if (yearNum > today.getFullYear()) {
      return { isValid: false, error: "Năm không thể ở tương lai." };
    }
    if (yearNum < 1900) {
      return { isValid: false, error: "Năm phải lớn hơn hoặc bằng 1900." };
    }

    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    if (dayNum > daysInMonth) {
      return { isValid: false, error: `Tháng ${monthNum} chỉ có ${daysInMonth} ngày.` };
    }

    return { isValid: true };
  };

  const handleSubmit = async () => {
    // Kiểm tra ngày sinh hợp lệ nếu có dữ liệu
    if (selectedDay || selectedMonth || selectedYear) {
      const validation = validateDate(selectedDay, selectedMonth, selectedYear);
      if (!validation.isValid) {
        Alert.alert("Lỗi", validation.error);
        return;
      }
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const formDataToSend = new FormData();

      // Thêm các trường vào formDataToSend, chỉ thêm nếu giá trị không rỗng
      if (formData.last_name) {
        formDataToSend.append("last_name", formData.last_name);
      }
      if (formData.first_name) {
        formDataToSend.append("first_name", formData.first_name);
      }
      if (formData.phone_number) {
        formDataToSend.append("phone_number", formData.phone_number);
      }
      if (formData.email) {
        formDataToSend.append("email", formData.email);
      }
      if (formData.citizen_id) {
        formDataToSend.append("citizen_id", formData.citizen_id);
      }
      if (formData.birth_date) {
        formDataToSend.append("birth_date", formData.birth_date);
      }
      if (formData.gender) {
        formDataToSend.append("gender", formData.gender);
      }
      if (formData.avatar && formData.avatar.uri) {
        formDataToSend.append("avatar", {
          uri: Platform.OS === "android" ? formData.avatar.uri : formData.avatar.uri.replace("file://", ""),
          type: "image/jpeg",
          name: "avatar.jpg",
        });
      }

      console.log("Sending form data:", formDataToSend); // Debug

      // Gửi yêu cầu cập nhật lên API
      const response = await authApis(token).patch(endpoints["currentUser"], formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("API Response:", response.data); // Debug

      // Lấy dữ liệu người dùng mới sau khi cập nhật
      const updatedResponse = await authApis(token).get(endpoints["currentUser"]);
      const updatedData = updatedResponse.data;
      console.log("Updated data from API:", updatedData); // Debug

      // Điều hướng về màn hình "Account" với dữ liệu mới
      navigation.navigate("Account", { updatedData });

      Alert.alert("Thành công", "Cập nhật thông tin thành công!", [
        {
          text: "OK",
        },
      ]);
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Đã có lỗi xảy ra.";
      Alert.alert("Lỗi", errorMessage);
      console.error("Error during submission:", error.response?.data || error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  const displayDate = selectedDay && selectedMonth && selectedYear
    ? `${selectedDay} - ${vietnameseMonths[parseInt(selectedMonth) - 1]} - ${selectedYear}`
    : "--/--/----";

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.profileCard}>
        {formData.avatar ? (
          <Image source={{ uri: formData.avatar.uri }} style={styles.avatar} />
        ) : (
          <MaterialCommunityIcons name="account-circle" size={80} color="#fff" />
        )}
        <TouchableOpacity onPress={pickImage}>
          <Text style={styles.changeAvatarText}>Thay đổi ảnh đại diện</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.section}>
          <Text style={styles.label}>Họ và tên đệm</Text>
          <TextInput
            style={styles.input}
            value={formData.last_name}
            onChangeText={(text) => setFormData({ ...formData, last_name: text })}
            placeholder="Ví dụ: Nguyễn Văn"
          />

          <Text style={styles.label}>Tên</Text>
          <TextInput
            style={styles.input}
            value={formData.first_name}
            onChangeText={(text) => setFormData({ ...formData, first_name: text })}
            placeholder="Ví dụ: A"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Ví dụ: nguyenvana@gmail.com"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={formData.phone_number}
            onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
            placeholder="Ví dụ: 0123456789"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Căn cước công dân</Text>
          <TextInput
            style={styles.input}
            value={formData.citizen_id}
            onChangeText={(text) => setFormData({ ...formData, citizen_id: text })}
            placeholder="Ví dụ: 123456789012"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Ngày sinh</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setDatePickerVisible(true)}
          >
            <Text style={styles.dateText}>{displayDate}</Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSelectedDay("");
                setSelectedMonth("");
                setSelectedYear("");
                handleDayMonthYearChange();
              }}
            >
              <MaterialCommunityIcons name="close" size={20} color="#021b42" />
            </TouchableOpacity>
          </TouchableOpacity>

          <Text style={styles.label}>Giới tính</Text>
          <View style={styles.genderContainer}>
            {[
              { value: "M", label: "Nam" },
              { value: "F", label: "Nữ" },
              { value: "O", label: "Khác" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  formData.gender === option.value && styles.genderOptionSelected,
                ]}
                onPress={() => setFormData({ ...formData, gender: option.value })}
              >
                <Text
                  style={
                    formData.gender === option.value
                      ? styles.genderTextSelected
                      : styles.genderText
                  }
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Lưu thay đổi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal cho Picker Ngày-Tháng-Năm */}
      <Modal
        transparent={true}
        visible={isDatePickerVisible}
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Dòng cố định cho title "Ngày", "Tháng", "Năm" */}
            <View style={styles.fixedTitleContainer}>
              <Text style={[styles.fixedTitle, { width: 130 }]}>Ngày</Text>
              <Text style={[styles.fixedTitle, { width: 140 }]}>Tháng</Text>
              <Text style={[styles.fixedTitle, { width: 130 }]}>Năm</Text>
            </View>
            {/* Picker cho chọn giá trị */}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedDay}
                style={[styles.picker, { width: 100 }]}
                onValueChange={(itemValue) => setSelectedDay(itemValue)}
              >
                <Picker.Item label="" value="" />
                {days.map((day) => (
                  <Picker.Item key={day} label={day} value={day} />
                ))}
              </Picker>
              <Picker
                selectedValue={selectedMonth}
                style={[styles.picker, { width: 140 }]}
                onValueChange={(itemValue) => setSelectedMonth(itemValue)}
              >
                <Picker.Item label="" value="" />
                {months.map((month, index) => (
                  <Picker.Item key={month} label={vietnameseMonths[index]} value={month} />
                ))}
              </Picker>
              <Picker
                selectedValue={selectedYear}
                style={[styles.picker, { width: 110 }]}
                onValueChange={(itemValue) => setSelectedYear(itemValue)}
              >
                <Picker.Item label="" value="" />
                {years.map((year) => (
                  <Picker.Item key={year} label={year} value={year} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDatePickerVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={() => {
                  setDatePickerVisible(false);
                  handleDayMonthYearChange();
                }}
              >
                <Text style={styles.modalButtonText}>Xong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6a97a4",
  },
  header: {
    height: 50,
    backgroundColor: "#0c5776",
    justifyContent: "flex-start",
    paddingLeft: 10,
    alignItems: "center",
    flexDirection: "row",
    position: "absolute",
  },
  backButton: {
    padding: 10,
    position: "relative",
    top: 30,
    left: 0,
    zIndex: 1,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#0c5776",
    padding: 20,
    paddingTop: 50,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  changeAvatarText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
  section: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    color: "#021b42",
    marginLeft: 5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8dad0",
    borderWidth: 1,
    borderColor: "#f9ccbd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 16,
    color: "#021b42",
  },
  dateInput: {
    backgroundColor: "#f8dad0",
    borderWidth: 1,
    borderColor: "#f9ccbd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#021b42",
  },
  clearButton: {
    padding: 5,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  genderOption: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: "#e0f2fe",
  },
  genderOptionSelected: {
    backgroundColor: "#f8dad0",
  },
  genderText: {
    fontSize: 16,
    color: "#333",
  },
  genderTextSelected: {
    fontSize: 16,
    color: "#0c5776",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#0c5776",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#0c5776",
    paddingVertical: 20,
  },
  fixedTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f9ccbd",
  },
  fixedTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0c5776",
    borderRadius: 8,
  },
  picker: {
    height: 200,
    color: "#021b42",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingHorizontal: 30,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f8dad0",
    marginRight: 10,
  },
  doneButton: {
    backgroundColor: "#f8dad0",
  },
  modalButtonText: {
    color: "#021b42",
    fontSize: 16,
  },
});

export default Profile;