import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
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

const RecordSearch = ({ navigation }) => {
  const [vaccinationRecords, setVaccinationRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [displayedRecords, setDisplayedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 4; // Số lượng bản ghi hiển thị mỗi lần tải
  const [q, setQ] = useState(""); // Từ khóa tìm kiếm theo vaccine_name
  const [filterMonth, setFilterMonth] = useState(""); // Bộ lọc tháng
  const [filterYear, setFilterYear] = useState(""); // Bộ lọc năm
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchRecordSearch();
  }, []);

  const fetchRecordSearch = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["recordSearch"]);

      // Sắp xếp theo ngày tiêm gần nhất đến xa nhất
      const sortedRecords = response.data.sort(
        (a, b) => new Date(b.injection_date) - new Date(a.injection_date)
      );

      setVaccinationRecords(sortedRecords);
      filterRecords(sortedRecords, q, filterMonth, filterYear); // Áp dụng tìm kiếm và lọc ngay sau khi tải
    } catch (error) {
      console.error("Error fetching vaccination history:", error);
      Alert.alert("Lỗi", "Không thể tải lịch sử tiêm chủng.");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý tìm kiếm và lọc theo vaccine_name, tháng, năm (phía client)
  const filterRecords = (records, searchQuery, month, year) => {
    let filtered = records;

    // Lọc theo tháng và năm
    if (month || year) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.injection_date);
        const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, "0");
        const recordYear = recordDate.getFullYear().toString();
        return (
          (!month || recordMonth === month) &&
          (!year || recordYear === year)
        );
      });
    }

    // Tìm kiếm theo vaccine_name
    if (searchQuery) {
      filtered = filtered.filter((record) =>
        record.vaccine_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRecords(filtered);

    // Hiển thị trang đầu tiên (lazy loading)
    setDisplayedRecords(filtered.slice(0, pageSize));
    setPage(1);

    // Log số lượng bản ghi sau khi lọc
    console.log("filterRecords - Total filtered records:", filtered.length);
    console.log("filterRecords - Displayed records (initial):", filtered.slice(0, pageSize).length);
    console.log("filterRecords - Current page:", 1);
  };

  // Xử lý lazy loading khi cuộn đến cuối danh sách
  const loadMoreRecords = () => {
    console.log("loadMoreRecords - Triggered");
    console.log("loadMoreRecords - Current displayed records:", displayedRecords.length);
    console.log("loadMoreRecords - Total filtered records:", filteredRecords.length);

    if (displayedRecords.length >= filteredRecords.length) {
      console.log("loadMoreRecords - No more records to load");
      return;
    }

    const nextPage = page + 1;
    const newRecords = filteredRecords.slice(0, nextPage * pageSize);
    setDisplayedRecords(newRecords);
    setPage(nextPage);

    console.log("loadMoreRecords - New page:", nextPage);
    console.log("loadMoreRecords - New displayed records:", newRecords.length);
  };

  // Xử lý tìm kiếm
  const search = (value) => {
    setQ(value);
    filterRecords(vaccinationRecords, value, filterMonth, filterYear);
  };

  // Xử lý áp dụng bộ lọc
  const applyFilter = () => {
    const validation = validateDate(filterMonth, filterYear);
    if (!validation.isValid) {
      Alert.alert("Lỗi", validation.error);
      return;
    }
    filterRecords(vaccinationRecords, q, filterMonth, filterYear);
    setIsFilterVisible(false);
  };

  // Xử lý xóa bộ lọc
  const clearFilter = () => {
    setFilterMonth("");
    setFilterYear("");
    filterRecords(vaccinationRecords, q, "", "");
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
    if (year && (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear)) {
      return { isValid: false, error: `Năm phải nằm trong khoảng từ 1900 đến ${currentYear}.` };
    }

    return { isValid: true };
  };

  const renderVaccinationRecord = ({ item }) => (
    <View style={styles.recordCard}>
      <Text style={[styles.recordText, { fontWeight: "bold" }]}>
        {item?.vaccine_name || "Không xác định"}
      </Text>
      <Text style={styles.recordText}>Loại: {item?.vaccine_type_name || "Không xác định"}</Text>
      <Text style={styles.recordText}>Liều số: {item.dose_number}</Text>
      <Text style={styles.recordText}>
        Ngày tiêm: {new Date(item.injection_date).toLocaleDateString("vi-VN")}
      </Text>
      <Text style={styles.recordText}>
        Dặn dò sau tiêm: {item?.health_note || "Không có"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Sử Tiêm Chủng</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setIsFilterVisible(true)}
        >
          <MaterialCommunityIcons name="filter" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Nhập tên vaccine"
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
        <FlatList
          data={displayedRecords}
          renderItem={renderVaccinationRecord}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={loadMoreRecords}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {q || filterMonth || filterYear
                ? "Không tìm thấy lịch sử tiêm với bộ lọc này."
                : "Không có lịch sử tiêm chủng."}
            </Text>
          }
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            displayedRecords.length < filteredRecords.length && (
              <ActivityIndicator size="small" color="#0c5776" style={styles.footerLoader} />
            )
          }
        />
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
            {/* Dòng cố định cho title "Tháng", "Năm" */}
            <View style={styles.fixedTitleContainer}>
              <Text style={[styles.fixedTitle, { width: 170 }]}>Tháng</Text>
              <Text style={[styles.fixedTitle, { width: 130 }]}>Năm</Text>
            </View>
            {/* Picker cho chọn tháng và năm */}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    padding: 10,
    position: "relative",
    top: 30,
    left: 0,
    zIndex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    position: "relative",
    top: 30,
    left: 5,
  },
  filterButton: {
    padding: 10,
    position: "relative",
    top: 30,
    right: 0,
    zIndex: 1,
  },
  searchContainer: {
    marginTop: 140,
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
  listContainer: {
    paddingHorizontal: 16,
    marginVertical: 20,
  },
  recordCard: {
    backgroundColor: "#f8dad0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  recordText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  loader: {
    marginTop: 20,
  },
  footerLoader: {
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#021b42",
    textAlign: "center",
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
    height: 250,
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

export default RecordSearch;