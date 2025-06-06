import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StatusBar, StyleSheet, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import { Searchbar } from "react-native-paper";
import { Alert } from "react-native";

const AccountManagement = ({ navigation, route }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 4;

  useEffect(() => {
    console.log("Initial fetchUsers on mount");
    fetchUsers();
  }, []);

  // Kiểm tra tham số refresh từ route.params
  useEffect(() => {
    console.log("Route params:", route.params);
    if (route.params?.refresh) {
      console.log("Refresh triggered, calling fetchUsers");
      fetchUsers();
      // Reset tham số refresh để tránh lặp lại
      navigation.setParams({ refresh: false });
    }
  }, [route.params?.refresh]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      const response = await authApis(token).get(endpoints["user"]());
      console.log("Users API response:", JSON.stringify(response.data, null, 2));

      // Sắp xếp danh sách theo username (A-Z)
      const sortedUsers = response.data.sort((a, b) =>
        (a.username || "").localeCompare(b.username || "")
      );
      setUsers(sortedUsers);
      filterUsers(sortedUsers, q, 1);
    } catch (error) {
      console.error("Lỗi khi tải danh sách tài khoản:", error.response?.data || error.message);
      Alert.alert(
        "Lỗi",
        error.response?.data?.detail || "Không thể tải danh sách tài khoản. Vui lòng kiểm tra quyền truy cập."
      );
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = (data, searchQuery, pageNum) => {
    let filtered = [...data];

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          (user.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.last_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filtered.slice(startIndex, endIndex);

    setFilteredUsers((prev) =>
      pageNum === 1 ? paginatedUsers : [...prev, ...paginatedUsers]
    );
  };

  const loadMoreUsers = () => {
    if (isLoadingMore || filteredUsers.length >= users.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterUsers(users, q, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  const search = (value) => {
    setQ(value);
    setPage(1);
    filterUsers(users, value, 1);
  };

  const handleDelete = (userId) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn xóa tài khoản này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              await authApis(token).delete(endpoints["user"](userId));
              Alert.alert("Thành công", "Tài khoản đã được xóa.");
              fetchUsers();
            } catch (error) {
              console.error("Lỗi khi xóa tài khoản:", error.response?.data || error.message);
              Alert.alert(
                "Lỗi",
                error.response?.data?.detail || "Không thể xóa tài khoản. Vui lòng kiểm tra quyền truy cập."
              );
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={[styles.userText, { fontWeight: "bold" }]}>Tên tài khoản: {item.username || "Không xác định"}</Text>
        <Text style={styles.userText}>Email: {item.email || "Không xác định"}</Text>
        <Text style={styles.userText}>
          Họ tên: {item.first_name || ""} {item.last_name || ""}
        </Text>
        <Text style={styles.userText}>
          Quyền: {item.is_superuser ? "Admin" : item.is_staff ? "Nhân viên" : "Người dùng"}
        </Text>
        <Text style={styles.userText}>Trạng thái: {item.is_active ? "Hoạt động" : "Không hoạt động"}</Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("EditAccount", { user: item })}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <MaterialCommunityIcons name="delete" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Xóa</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Quản Lý Tài Khoản</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddAccount")}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Nhập tên tài khoản / tên người dùng"
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
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {q ? "Không tìm thấy tài khoản với từ khóa này." : "Không có tài khoản nào."}
              </Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreUsers}
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
  addButton: {
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
  userCard: {
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
  userInfo: {
    flex: 1,
  },
  userText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  userActions: {
    flexDirection: "column",
    justifyContent: "center",
  },
  actionButton: {
    backgroundColor: "#0c5776",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  deleteButton: {
    backgroundColor: "#f08486",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
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

export default AccountManagement;