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
  Switch,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const InjectionSearch = ({ navigation }) => {
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewPast, setViewPast] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSchedules();
  }, [viewPast]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["allSchedules"], {
        params: { view_past: viewPast ? "true" : "false" },
      });
      setSchedules(response.data);
      filterSchedules(response.data, searchQuery, 1);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const filterSchedules = (data, query, pageNum) => {
    let filtered = data;

    if (query) {
      filtered = filtered.filter((schedule) =>
        schedule.vaccine.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSchedules = filtered.slice(startIndex, endIndex);

    setFilteredSchedules((prev) =>
      pageNum === 1 ? paginatedSchedules : [...prev, ...paginatedSchedules]
    );
  };

  const loadMoreSchedules = () => {
    if (isLoadingMore || filteredSchedules.length >= schedules.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterSchedules(schedules, searchQuery, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setPage(1);
    filterSchedules(schedules, query, 1);
  };

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
        <Text style={styles.headerTitle}>Tra Cứu Lịch Tiêm</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <View style={styles.filterContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên vaccine..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Xem lịch đã qua</Text>
              <Switch
                value={viewPast}
                onValueChange={(value) => {
                  setViewPast(value);
                  setPage(1);
                }}
                trackColor={{ false: "#767577", true: "#0c5776" }}
                thumbColor={viewPast ? "#f4f3f4" : "#f4f3f4"}
              />
            </View>
          </View>

          <FlatList
            data={filteredSchedules}
            renderItem={renderSchedule}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không có lịch tiêm nào.</Text>
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
  placeholder: {
    width: 44,
  },
  contentContainer: {
    flex: 1,
    marginTop: 20,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: "#021b42",
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
});

export default InjectionSearch;