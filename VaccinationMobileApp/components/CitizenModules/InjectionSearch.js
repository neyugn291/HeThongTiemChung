import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import { Searchbar } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";

// Danh sách tháng bằng tiếng Việt
const vietnameseMonths = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const InjectionSearch = ({ navigation }) => {
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [q, setQ] = useState(""); // State cho từ khóa tìm kiếm
  const itemsPerPage = 10;

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2020 + 6 }, (_, i) => (currentYear + i - 5).toString());

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Lấy danh sách lịch tiêm sắp tới
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["upcomingSchedules"]);
      const sortedSchedules = response.data.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      setSchedules(sortedSchedules);
      filterSchedules(sortedSchedules, q, filterMonth, filterYear, 1);
    } catch (error) {
      console.error("Lỗi khi tải lịch tiêm:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch tiêm.");
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // Lọc và phân trang dữ liệu
  const filterSchedules = (data, searchQuery, month, year, pageNum) => {
    let filtered = data;

    // Lọc theo tháng và năm
    if (month || year) {
      filtered = filtered.filter((schedule) => {
        const scheduleDate = new Date(schedule.date);
        const scheduleMonth = (scheduleDate.getMonth() + 1).toString().padStart(2, "0");
        const scheduleYear = scheduleDate.getFullYear().toString();
        return (
          (!month || scheduleMonth === month) &&
          (!year || scheduleYear === year)
        );
      });
    }

    // Tìm kiếm theo tên vaccine
    if (searchQuery) {
      filtered = filtered.filter((schedule) =>
        schedule.vaccine.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Phân trang: chỉ lấy dữ liệu từ startIndex đến endIndex
    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSchedules = filtered.slice(startIndex, endIndex);

    // Cập nhật danh sách hiển thị
    setFilteredSchedules((prev) =>
      pageNum === 1 ? paginatedSchedules : [...prev, ...paginatedSchedules]
    );
  };

  // Tải thêm lịch khi cuộn đến cuối danh sách
  const loadMoreSchedules = () => {
    if (isLoadingMore || filteredSchedules.length >= schedules.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterSchedules(schedules, q, filterMonth, filterYear, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // Xử lý tìm kiếm
  const search = (value) => {
    setQ(value);
    setPage(1);
    filterSchedules(schedules, value, filterMonth, filterYear, 1);
  };

  // Áp dụng bộ lọc
  const applyFilter = () => {
    const validation = validateDate(filterMonth, filterYear);
    if (!validation.isValid) {
      Alert.alert("Lỗi", validation.error);
      return;
    }
    setPage(1);
    filterSchedules(schedules, q, filterMonth, filterYear, 1);
    setIsFilterVisible(false);
  };

  // Xóa bộ lọc
  const clearFilter = () => {
    setFilterMonth("");
    setFilterYear("");
    setPage(1);
    filterSchedules(schedules, q, "", "", 1);
    setIsFilterVisible(false);
  };

  // Kiểm tra tính hợp lệ của tháng và năm
  const validateDate = (month, year) => {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!month && !year) {
      return { isValid: true };
    }

    if (month && (isNaN(monthNum) || monthNum < 1 || monthNum > 12)) {
      return { isValid: false, error: "Tháng phải nằm trong khoảng từ 1 đến 12." };
    }
    if (year && (isNaN(yearNum) || yearNum < 2020 || yearNum > currentYear + 5)) {
      return { isValid: false, error: `Năm phải nằm trong khoảng từ 2020 đến ${currentYear + 5}.` };
    }

    return { isValid: true };
  };

  // Hiển thị mỗi lịch tiêm
  const renderSchedule = ({ item }) => (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleInfo}>
        <Text style={styles.scheduleText}>
          Vaccine: {item.vaccine?.name || "Không xác định"}
        </Text>
        <Text style={styles.scheduleText}>
          Ngày: {new Date(item.date).toLocaleDateString("vi-VN")}
        </Text>
        <Text style={styles.scheduleText}>
          Địa điểm: {item.site?.name || "Không xác định"}
        </Text>
        <Text style={styles.scheduleText}>Số lượng: {item.slot_count}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tra Cứu Lịch Tiêm Sắp Tới</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setIsFilterVisible(true)}
        >
          <MaterialCommunityIcons name="filter" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Tìm kiếm theo tên vaccine"
          onChangeText={search}
          value={q}
          style={styles.searchbar}
          inputStyle={styles.searchbarInput}
          placeholderTextColor="#021b42"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={filteredSchedules}
            renderItem={renderSchedule}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {q || filterMonth || filterYear
                  ? "Không tìm thấy lịch tiêm với bộ lọc này."
                  : "Không có lịch tiêm sắp tới."}
              </Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreSchedules}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color="#0c5776" style={styles.loader} />
              ) : null
            }
          />
        </View>
      )}

      {/* Modal cho bộ lọc tháng và năm */}
      <Modal
        transparent={true}
        visible={isFilterVisible}
        animationType="slide"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Tiêu đề cố định cho Tháng và Năm */}
            <View style={styles.fixedTitleContainer}>
              <Text style={[styles.fixedTitle, { width: 170 }]}>Tháng</Text>
              <Text style={[styles.fixedTitle, { width: 130 }]}>Năm</Text>
            </View>
            {/* Picker để chọn tháng và năm */}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterMonth}
                style={[styles.picker, { width: 150 }]}
                onValueChange={(itemValue) => setFilterMonth(itemValue)}
              >
                <Picker.Item label="Tất cả" value="" />
                {months.map((month, index) => (
                  <Picker.Item key={month} label={vietnameseMonths[index]} value={month} />
                ))}
              </Picker>
              <Picker
                selectedValue={filterYear}
                style={[styles.picker, { width: 140 }]}
                onValueChange={(itemValue) => setFilterYear(itemValue)}
              >
                <Picker.Item label="Tất cả" value="" />
                {years.map((year) => (
                  <Picker.Item key={year} label={year} value={year} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={clearFilter}
              >
                <Text style={styles.modalButtonText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={applyFilter}
              >
                <Text style={styles.modalButtonText}>Áp dụng</Text>
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
  filterButton: {
    padding: 10,
    marginTop: 30,
  },
  searchContainer: {
    marginTop: 20,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#021b42",
    paddingBottom: 20,
  },
  searchbar: {
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
  },
  searchbarInput: {
    fontSize: 16,
    color: "#021b42",
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  scheduleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8dad0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 16,
    color: "#021b42",
    textAlign: "center",
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
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
    paddingHorizontal: 80,
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
    paddingHorizontal: 30,
  },
  picker: {
    height: 150,
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

export default InjectionSearch;