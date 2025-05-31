import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Alert,
  Modal,
  Switch,
  FlatList,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const vietnameseMonths = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const statusOptions = [
  { label: "Đang sử dụng", value: "Active" },
  { label: "Ngừng sử dụng", value: "Discontinued" },
  { label: "Chưa phê duyệt", value: "Pending Approval" },
  { label: "Đã hết hạn", value: "Expired" },
];

const AddVaccine = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: "",
    vaccine_type: "",
    manufacturer: "",
    dose_count: "",
    dose_interval: "",
    age_group: "",
    description: "",
    approved_date: "",
    status: "Active",
    active: true,
  });
  const [vaccineTypes, setVaccineTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isVaccineTypePickerVisible, setVaccineTypePickerVisible] = useState(false);
  const [isStatusPickerVisible, setStatusPickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const days = Array.from({ length: 31 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) =>
    (currentYear - i).toString()
  );

  const displayDate =
    selectedDay && selectedMonth && selectedYear
      ? `${selectedDay} - ${vietnameseMonths[parseInt(selectedMonth) - 1]} - ${selectedYear}`
      : "--/--/----";

  const selectedStatusLabel =
    statusOptions.find((option) => option.value === formData.status)?.label ||
    "Chọn trạng thái";

  useEffect(() => {
    const fetchVaccineTypes = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        console.log("Fetching vaccine types with token:", token ? token.substring(0, 10) + "..." : "Missing");
        console.log("Endpoint:", endpoints.vaccineTypes());
        const response = await authApis(token).get(endpoints.vaccineTypes());
        console.log("VaccineTypes API response:", JSON.stringify(response.data, null, 2));
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        if (Array.isArray(data)) {
          const formattedTypes = data.map((item) => ({
            id: item.id.toString(),
            name: item.name || "Không xác định",
          }));
          setVaccineTypes(formattedTypes);
          console.log("Formatted vaccineTypes:", JSON.stringify(formattedTypes, null, 2));
        } else {
          console.warn("Unexpected response format:", response.data);
          setVaccineTypes([]);
          Alert.alert("Cảnh báo", "Dữ liệu loại vaccine không đúng định dạng.");
        }
      } catch (error) {
        console.error("Error fetching vaccine types:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        Alert.alert("Lỗi", "Không thể tải danh sách loại vaccine.");
        setVaccineTypes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVaccineTypes();
  }, []);

  const handleDayMonthYearChange = () => {
    if (selectedDay && selectedMonth && selectedYear) {
      const formattedDate = `${selectedYear}-${selectedMonth}-${selectedDay}`;
      setFormData({ ...formData, approved_date: formattedDate });
    } else {
      setFormData({ ...formData, approved_date: "" });
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
      return { isValid: false, error: "Ngày, tháng, năm không hợp lệ." };
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
      return {
        isValid: false,
        error: `Tháng ${monthNum} chỉ có ${daysInMonth} ngày.`,
      };
    }

    return { isValid: true };
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.vaccine_type) {
      Alert.alert("Lỗi", "Tên vaccine và loại vaccine là bắt buộc.");
      return;
    }

    if (formData.approved_date) {
      const validation = validateDate(selectedDay, selectedMonth, selectedYear);
      if (!validation.isValid) {
        Alert.alert("Lỗi", validation.error);
        return;
      }
    }

    if (!statusOptions.some((option) => option.value === formData.status)) {
      Alert.alert("Lỗi", "Trạng thái không hợp lệ.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const payload = {
        name: formData.name,
        vaccine_type: parseInt(formData.vaccine_type),
        manufacturer: formData.manufacturer || null,
        dose_count: formData.dose_count ? parseInt(formData.dose_count) : null,
        dose_interval: formData.dose_interval || null,
        age_group: formData.age_group || null,
        description: formData.description || null,
        approved_date: formData.approved_date || null,
        status: formData.status,
        active: formData.active,
      };
      console.log("Submit payload:", JSON.stringify(payload, null, 2));
      await authApis(token).post(endpoints.vaccines(), payload);

      const updatedVaccinesResponse = await authApis(token).get(
        endpoints.vaccines()
      );
      const updatedVaccines = updatedVaccinesResponse.data;

      Alert.alert("Thành công", "Thêm vaccine thành công!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("VaccineManagement", { updatedVaccines });
          },
        },
      ]);
    } catch (error) {
      console.error("Error adding vaccine:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      Alert.alert(
        "Lỗi",
        error.response?.data?.status?.[0] ||
          "Không thể thêm vaccine. Vui lòng kiểm tra dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedVaccineTypeName =
    vaccineTypes.find((type) => type.id === formData.vaccine_type)?.name ||
    "Chọn loại vaccine";

  const renderVaccineTypeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.comboboxItem}
      onPress={() => {
        setFormData({ ...formData, vaccine_type: item.id });
        setVaccineTypePickerVisible(false);
      }}
    >
      <Text style={styles.comboboxItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderStatusItem = ({ item }) => (
    <TouchableOpacity
      style={styles.comboboxItem}
      onPress={() => {
        setFormData({ ...formData, status: item.value });
        setStatusPickerVisible(false);
      }}
    >
      <Text style={styles.comboboxItemText}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm Vaccine</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.section}>
          <Text style={styles.label}>Tên vaccine</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Ví dụ: Pfizer-BioNTech"
          />

          <Text style={styles.label}>Loại vaccine</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setVaccineTypePickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateText}>{selectedVaccineTypeName}</Text>
            {formData.vaccine_type && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setFormData({ ...formData, vaccine_type: "" })}
              >
                <MaterialCommunityIcons name="close" size={20} color="#021b42" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Nhà sản xuất</Text>
          <TextInput
            style={styles.input}
            value={formData.manufacturer}
            onChangeText={(text) =>
              setFormData({ ...formData, manufacturer: text })
            }
            placeholder="Ví dụ: Pfizer Inc."
          />

          <Text style={styles.label}>Số lượng liều</Text>
          <TextInput
            style={styles.input}
            value={formData.dose_count}
            onChangeText={(text) =>
              setFormData({ ...formData, dose_count: text })
            }
            placeholder="Ví dụ: 2"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Khoảng cách liều (ngày)</Text>
          <TextInput
            style={styles.input}
            value={formData.dose_interval}
            onChangeText={(text) =>
              setFormData({ ...formData, dose_interval: text })
            }
            placeholder="Ví dụ: 21"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Nhóm tuổi</Text>
          <TextInput
            style={styles.input}
            value={formData.age_group}
            onChangeText={(text) =>
              setFormData({ ...formData, age_group: text })
            }
            placeholder="Ví dụ: 12+"
          />

          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
            placeholder="Mô tả chi tiết, lưu ý về vaccine"
            multiline
          />

          <Text style={styles.label}>Ngày phê duyệt</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setDatePickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateText}>{displayDate}</Text>
            {formData.approved_date && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSelectedDay("");
                  setSelectedMonth("");
                  setSelectedYear("");
                  setFormData({ ...formData, approved_date: "" });
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color="#021b42" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Trạng thái</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setStatusPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateText}>{selectedStatusLabel}</Text>
            {formData.status && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setFormData({ ...formData, status: "" })}
              >
                <MaterialCommunityIcons name="close" size={20} color="#021b42" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.label}>
              {formData.active ? "Hoạt động" : "Không hoạt động"}
            </Text>
            <Switch
              value={formData.active}
              onValueChange={(value) =>
                setFormData({ ...formData, active: value })
              }
              trackColor={{ false: "#767577", true: "#0c5776" }}
              thumbColor={formData.active ? "#f4f3f4" : "#f4f3f4"}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Đang xử lý..." : "Thêm"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        transparent={true}
        visible={isDatePickerVisible}
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.fixedTitleContainer}>
              <Text style={[styles.fixedTitle, { width: 130 }]}>Ngày</Text>
              <Text style={[styles.fixedTitle, { width: 140 }]}>Tháng</Text>
              <Text style={[styles.fixedTitle, { width: 130 }]}>Năm</Text>
            </View>
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
                  <Picker.Item
                    key={month}
                    label={vietnameseMonths[index]}
                    value={month}
                  />
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

      <Modal
        transparent={true}
        visible={isVaccineTypePickerVisible}
        animationType="slide"
        onRequestClose={() => setVaccineTypePickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.typeTitle}>Chọn Loại Vaccine</Text>
            <View style={styles.comboboxContainer}>
              {vaccineTypes.length > 0 ? (
                <FlatList
                  data={vaccineTypes}
                  renderItem={renderVaccineTypeItem}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Không có loại vaccine</Text>
                  }
                />
              ) : (
                <Text style={styles.emptyText}>Không có loại vaccine</Text>
              )}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setVaccineTypePickerVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={isStatusPickerVisible}
        animationType="slide"
        onRequestClose={() => setStatusPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.typeTitle}>Chọn Trạng Thái</Text>
            <View style={styles.comboboxContainer}>
              {statusOptions.length > 0 ? (
                <FlatList
                  data={statusOptions}
                  renderItem={renderStatusItem}
                  keyExtractor={(item) => item.value}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Không có trạng thái</Text>
                  }
                />
              ) : (
                <Text style={styles.emptyText}>Không có trạng thái</Text>
              )}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setStatusPickerVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
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
    height: 100,
    backgroundColor: "#0c5776",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
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
    marginLeft: 10,
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
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#021b42",
  },
  dateInput: {
    backgroundColor: "#f8dad0",
    borderWidth: 1,
    borderColor: "#f9ccbd",
    borderRadius: 8,
    padding: 12,
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
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: "#0c5776",
    padding: 12,
    borderRadius: 8,
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
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    height: 250,
    color: "#021b42",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    marginTop: 20,
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
  typeTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  comboboxContainer: {
    paddingHorizontal: 30,
    maxHeight: 250,
  },
  comboboxItem: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#6a97a4",
  },
  comboboxItemText: {
    fontSize: 16,
    color: "#f4f3f4",
  },
  emptyText: {
    fontSize: 16,
    color: "#021b42",
    textAlign: "center",
    padding: 12,
  },
});

export default AddVaccine;