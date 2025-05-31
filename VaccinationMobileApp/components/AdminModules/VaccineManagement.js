import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import { Picker } from "@react-native-picker/picker";

const VaccineManagement = ({ navigation, route }) => {
  const [vaccines, setVaccines] = useState([]);
  const [filteredVaccines, setFilteredVaccines] = useState([]);
  const [displayedVaccines, setDisplayedVaccines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 10;

  // Lấy danh sách loại vaccine từ dữ liệu
  const vaccineTypes = Array.from(
    new Set(vaccines.map((v) => v.vaccine_type_name).filter(Boolean))
  );

  useEffect(() => {
    if (route.params?.updatedVaccines) {
      const sortedVaccines = route.params.updatedVaccines.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setVaccines(sortedVaccines);
      filterVaccines(sortedVaccines, searchQuery, filterType, 1);
    } else {
      fetchVaccines();
    }
  }, [route.params?.updatedVaccines]);

  const fetchVaccines = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["vaccines"]());
      const sortedVaccines = response.data.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setVaccines(sortedVaccines);
      filterVaccines(sortedVaccines, searchQuery, filterType, 1);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách vaccine.");
    } finally {
      setLoading(false);
    }
  };

  const filterVaccines = (vaccines, query, type, pageNum) => {
    let filtered = vaccines;

    if (query) {
      filtered = filtered.filter((vaccine) =>
        vaccine.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (type) {
      filtered = filtered.filter(
        (vaccine) => vaccine.vaccine_type_name === type
      );
    }

    setFilteredVaccines(filtered);

    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedVaccines = filtered.slice(startIndex, endIndex);

    setDisplayedVaccines((prev) =>
      pageNum === 1 ? paginatedVaccines : [...prev, ...paginatedVaccines]
    );
  };

  const loadMoreVaccines = () => {
    if (isLoadingMore || displayedVaccines.length >= filteredVaccines.length)
      return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterVaccines(filteredVaccines, searchQuery, filterType, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setPage(1);
    filterVaccines(vaccines, query, filterType, 1);
  };

  const applyFilter = () => {
    setPage(1);
    filterVaccines(vaccines, searchQuery, filterType, 1);
    setIsFilterVisible(false);
  };

  const clearFilter = () => {
    setFilterType("");
    setPage(1);
    filterVaccines(vaccines, searchQuery, "", 1);
    setIsFilterVisible(false);
  };

  const renderVaccine = ({ item }) => (
    <TouchableOpacity
      style={styles.vaccineCard}
      onPress={() =>
        navigation.navigate("UpdateVaccine", {
          vaccineId: item.id,
        })
      }
    >
      <View style={styles.vaccineInfo}>
        <Text style={[styles.vaccineText, { fontWeight: "bold" }]}>
          {item.name}
        </Text>
        <Text style={styles.vaccineText}>
          Loại vaccine: {item?.vaccine_type_name || "Không xác định"}
        </Text>
        <Text style={styles.vaccineText}>
          Nhà sản xuất: {item?.manufacturer || "Không xác định"}
        </Text>
        <Text style={styles.vaccineText}>
          Số lượng liều: {item?.dose_count || "Không xác định"}
        </Text>
      </View>
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
        <Text style={styles.headerTitle}>Quản Lý Vaccine</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setIsFilterVisible(true)}
        >
          <MaterialCommunityIcons name="filter" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập tên vaccine"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddVaccine")}
          >
            <Text style={styles.addButtonText}>Thêm Vaccine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.typeButton}
            onPress={() => navigation.navigate("TypeManagement")}
          >
            <Text style={styles.typeButtonText}>Chỉnh sửa loại vaccine</Text>
          </TouchableOpacity>
          <FlatList
            data={displayedVaccines}
            renderItem={renderVaccine}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không có vaccine nào.</Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreVaccines}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator
                  size="small"
                  color="#0c5776"
                  style={styles.loader}
                />
              ) : null
            }
          />
        </View>
      )}

      {/* Modal bộ lọc loại vaccine */}
      <Modal
        transparent={true}
        visible={isFilterVisible}
        animationType="slide"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.fixedTitle}>Loại Vaccine</Text>
            <Picker
              selectedValue={filterType}
              style={styles.picker}
              onValueChange={(itemValue) => setFilterType(itemValue)}
            >
              <Picker.Item label="Tất cả" value="" />
              {vaccineTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
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
  contentContainer: {
    flex: 1,
    marginTop: 20,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  vaccineCard: {
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
  vaccineInfo: {
    flex: 1,
  },
  vaccineText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#0c5776",
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  typeButton: {
    backgroundColor: "#0c5776",
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  typeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#616161",
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
  fixedTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    paddingBottom: 10,
  },
  picker: {
    height: 250,
    color: "#021b42",
    marginHorizontal: 30,
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

export default VaccineManagement;