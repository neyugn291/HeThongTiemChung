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
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import { Switch } from "react-native";

const InjectionManagement = ({ navigation }) => {
  const [schedules, setSchedules] = useState([]);
  const [displayedSchedules, setDisplayedSchedules] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [siteModalVisible, setSiteModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSite, setIsEditingSite] = useState(false);
  const [showPastSchedules, setShowPastSchedules] = useState(false);
  const [showVaccineList, setShowVaccineList] = useState(false);
  const [showSiteList, setShowSiteList] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState({
    id: null,
    vaccine_id: null,
    vaccine_name: "",
    vaccine_type_name: "",
    date: "",
    site_id: null,
    site_name: "",
    slot_count: "",
  });
  const [originalSchedule, setOriginalSchedule] = useState(null);
  const [currentSite, setCurrentSite] = useState({ id: null, name: "", address: "", phone: "" });
  const [page, setPage] = useState(1);
  const pageSize = 4; // Số lượng bản ghi hiển thị mỗi lần tải

  const currentDate = new Date("2025-06-04T15:33:00+07:00"); // Thời gian hiện tại: 03:33 PM +07, 04/06/2025

  useEffect(() => {
    fetchSchedules();
    fetchVaccines();
    fetchSites();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      const scheduleEndpoint = endpoints["schedules"]();
      if (typeof scheduleEndpoint !== "string") {
        throw new Error("Endpoint 'schedules' không trả về chuỗi hợp lệ.");
      }

      const response = await authApis(token).get(scheduleEndpoint);
      console.log("Schedules API response:", JSON.stringify(response.data, null, 2));
      const sortedSchedules = response.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setSchedules(sortedSchedules);
      setDisplayedSchedules(sortedSchedules.slice(0, pageSize)); // Hiển thị trang đầu tiên
      setPage(1);
    } catch (error) {
      console.error("Error fetching schedules:", error.message || error);
      Alert.alert("Lỗi", "Không thể tải danh sách đợt tiêm. Vui lòng kiểm tra kết nối hoặc cấu hình API.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVaccines = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");
      const response = await authApis(token).get(endpoints["vaccines"]());
      console.log("Vaccines API response:", JSON.stringify(response.data, null, 2));
      setVaccines(response.data);
    } catch (error) {
      console.error("Error fetching vaccines:", error.message || error);
      Alert.alert("Lỗi", "Không thể tải danh sách vaccine.");
    }
  };

  const fetchSites = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");
      const response = await authApis(token).get(endpoints["sites"]());
      console.log("Sites API response:", JSON.stringify(response.data, null, 2));
      const uniqueSites = response.data.map((site, index) => ({
        id: site.id || index + 1,
        name: site.name || site.site_name || "Không xác định",
        address: site.address || "Không xác định",
        phone: site.phone || "Không xác định",
      }));
      setSites(uniqueSites);
    } catch (error) {
      console.error("Error fetching sites:", error.message || error);
      Alert.alert("Lỗi", "Không thể tải danh sách địa điểm.");
    }
  };

  const loadMoreSchedules = () => {
    if (displayedSchedules.length >= schedules.length) return;

    const nextPage = page + 1;
    const newSchedules = schedules.slice(0, nextPage * pageSize);
    setDisplayedSchedules(newSchedules);
    setPage(nextPage);

    console.log("loadMoreSchedules - New page:", nextPage);
    console.log("loadMoreSchedules - New displayed schedules:", newSchedules.length);
  };

  const openModal = (schedule = null) => {
    if (schedule) {
      setIsEditing(true);
      console.log("Schedule data on edit:", JSON.stringify(schedule, null, 2));

      const scheduleData = {
        id: schedule.id,
        vaccine_id: schedule.vaccine_id,
        vaccine_name: schedule.vaccine_name || "",
        vaccine_type_name: schedule.vaccine_type_name || "",
        date: schedule.date || "",
        site_id: schedule.site_id,
        site_name: schedule.site_name || "",
        slot_count: schedule.slot_count ? schedule.slot_count.toString() : "",
      };

      setCurrentSchedule(scheduleData);
      setOriginalSchedule(schedule);
    } else {
      setIsEditing(false);
      const newSchedule = {
        id: null,
        vaccine_id: null,
        vaccine_name: "",
        vaccine_type_name: "",
        date: "",
        site_id: null,
        site_name: "",
        slot_count: "",
      };
      setCurrentSchedule(newSchedule);
      setOriginalSchedule(null);
    }
    setModalVisible(true);
  };

  const openSiteModal = (site = null) => {
    if (site) {
      setIsEditingSite(true);
      setCurrentSite({
        id: site.id,
        name: site.name,
        address: site.address,
        phone: site.phone,
      });
    } else {
      setIsEditingSite(false);
      setCurrentSite({ id: null, name: "", address: "", phone: "" });
    }
    setSiteModalVisible(true);
  };

  const selectVaccine = (vaccine) => {
    setCurrentSchedule({
      ...currentSchedule,
      vaccine_id: vaccine.id,
      vaccine_name: vaccine.name,
      vaccine_type_name: vaccine.vaccine_type_name,
    });
    setShowVaccineList(false);
  };

  const selectSite = (site) => {
    setCurrentSchedule({
      ...currentSchedule,
      site_id: site.id,
      site_name: site.name,
    });
    setShowSiteList(false);
  };

  const validateDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const saveSchedule = async () => {
    if (!isEditing) {
      if (
        !currentSchedule.vaccine_id ||
        !currentSchedule.date ||
        !currentSchedule.site_id ||
        !currentSchedule.slot_count
      ) {
        Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
        return;
      }
    }

    if (currentSchedule.date && !validateDate(currentSchedule.date)) {
      Alert.alert("Lỗi", "Ngày không hợp lệ. Vui lòng nhập theo định dạng YYYY-MM-DD (VD: 2025-06-02).");
      return;
    }

    let finalVaccineId = currentSchedule.vaccine_id;
    let finalSiteId = currentSchedule.site_id;

    if (isEditing) {
      if (
        originalSchedule &&
        currentSchedule.vaccine_id === originalSchedule.vaccine_id &&
        currentSchedule.vaccine_name === originalSchedule.vaccine_name &&
        currentSchedule.vaccine_type_name === originalSchedule.vaccine_type_name
      ) {
        finalVaccineId = originalSchedule.vaccine_id;
      } else if (!currentSchedule.vaccine_id || isNaN(parseInt(currentSchedule.vaccine_id))) {
        Alert.alert("Lỗi", "Vaccine không hợp lệ. Vui lòng chọn lại vaccine.");
        return;
      }

      if (
        originalSchedule &&
        currentSchedule.site_id === originalSchedule.site_id &&
        currentSchedule.site_name === originalSchedule.site_name
      ) {
        finalSiteId = originalSchedule.site_id;
      } else if (!currentSchedule.site_id || isNaN(parseInt(currentSchedule.site_id))) {
        Alert.alert("Lỗi", "Địa điểm không hợp lệ. Vui lòng chọn lại địa điểm.");
        return;
      }
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      const scheduleData = {
        vaccine: finalVaccineId,
        date: currentSchedule.date || originalSchedule?.date,
        site: finalSiteId,
        slot_count: parseInt(currentSchedule.slot_count) || parseInt(originalSchedule?.slot_count) || 0,
      };

      console.log("Data being sent:", JSON.stringify(scheduleData, null, 2));

      if (isEditing) {
        const scheduleEndpoint = endpoints["schedules"](currentSchedule.id);
        const response = await authApis(token).put(scheduleEndpoint, scheduleData);
        console.log("Update schedule response:", JSON.stringify(response.data, null, 2));
        Alert.alert("Thành công", "Cập nhật đợt tiêm thành công!");
      } else {
        const scheduleEndpoint = endpoints["schedules"]();
        const response = await authApis(token).post(scheduleEndpoint, scheduleData);
        console.log("Create schedule response:", JSON.stringify(response.data, null, 2));
        Alert.alert("Thành công", "Thêm đợt tiêm thành công!");
      }
      setModalVisible(false);
      fetchSchedules();
    } catch (error) {
      console.error("Error saving schedule:", error.response?.data || error.message);
      Alert.alert("Lỗi", "Không thể lưu thông tin đợt tiêm. Vui lòng thử lại.");
    }
  };

  const saveSite = async () => {
    if (!currentSite.name || !currentSite.address || !currentSite.phone) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin địa điểm (tên, địa chỉ, số điện thoại).");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      const siteData = {
        name: currentSite.name,
        address: currentSite.address,
        phone: currentSite.phone,
      };

      if (isEditingSite) {
        const siteEndpoint = endpoints["sites"](currentSite.id);
        const response = await authApis(token).patch(siteEndpoint, siteData);
        console.log("Update site response:", JSON.stringify(response.data, null, 2));
        Alert.alert("Thành công", "Cập nhật địa điểm thành công!");
      } else {
        const siteEndpoint = endpoints["sites"]();
        const response = await authApis(token).post(siteEndpoint, siteData);
        console.log("Create site response:", JSON.stringify(response.data, null, 2));
        Alert.alert("Thành công", "Thêm địa điểm thành công!");
      }
      setSiteModalVisible(false);
      await fetchSites();
      if (showSiteList) {
        setShowSiteList(false);
        setTimeout(() => setShowSiteList(true), 100);
      }
    } catch (error) {
      console.error("Error saving site:", error.response?.data || error.message);
      Alert.alert("Lỗi", "Không thể lưu thông tin địa điểm. Vui lòng thử lại.");
    }
  };

  const deleteSite = async (siteId) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn xóa địa điểm này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) throw new Error("Token không tồn tại.");
              const siteEndpoint = endpoints["sites"](siteId);
              const response = await authApis(token).delete(siteEndpoint);
              console.log("Delete site response:", response.status);
              Alert.alert("Thành công", "Xóa địa điểm thành công!");
              await fetchSites();
              if (showSiteList) {
                setShowSiteList(false);
                setTimeout(() => setShowSiteList(true), 100);
              }
            } catch (error) {
              console.error("Error deleting site:", error.response?.data || error.message);
              Alert.alert("Lỗi", "Không thể xóa địa điểm. Vui lòng thử lại.");
            }
          },
        },
      ]
    );
  };

  const deleteSchedule = async (scheduleId) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn xóa đợt tiêm này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) throw new Error("Token không tồn tại.");
              const scheduleEndpoint = endpoints["schedules"](scheduleId);
              const response = await authApis(token).delete(scheduleEndpoint);
              console.log("Delete schedule response:", response.status);
              Alert.alert("Thành công", "Xóa đợt tiêm thành công!");
              fetchSchedules();
            } catch (error) {
              console.error("Error deleting schedule:", error.response?.data || error.message);
              Alert.alert("Lỗi", "Không thể xóa đợt tiêm. Vui lòng thử lại.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isPast = new Date(item.date) < currentDate;
    const showActions = !isPast && !showPastSchedules;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemText, { fontWeight: "bold" }]}>
            {item.vaccine_name || "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Loại: {item.vaccine_type_name || "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Ngày: {item.date ? new Date(item.date).toLocaleDateString("vi-VN") : "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Địa điểm: {item.site_name || "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Số lượng slot: {item.slot_count || "Không xác định"}
          </Text>
          {showActions && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#0c5776" }]}
                onPress={() => openModal(item)}
              >
                <Text style={styles.actionButtonText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#f08486" }]}
                onPress={() => deleteSchedule(item.id)}
              >
                <Text style={styles.actionButtonText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderVaccineItem = ({ item }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => selectVaccine(item)}>
      <Text style={styles.listItemText}>
        {item.name} ({item.vaccine_type_name})
      </Text>
    </TouchableOpacity>
  );

  const renderSiteItem = ({ item }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => selectSite(item)}>
      <Text style={styles.listItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderSiteListItem = ({ item }) => (
    <View style={styles.siteListItem}>
      <View style={styles.siteInfo}>
        <Text style={[styles.siteListItemText, { fontWeight: "bold" }]}>{item.name}</Text>
        <Text style={styles.siteListItemText}>Địa chỉ: {item.address}</Text>
        <Text style={styles.siteListItemText}>Số điện thoại: {item.phone}</Text>
      </View>
      <View style={styles.siteActionButtons}>
        <TouchableOpacity
          style={[styles.siteActionButton, { backgroundColor: "#0c5776" }]}
          onPress={() => openSiteModal(item)}
        >
          <Text style={styles.siteActionButtonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.siteActionButton, { backgroundColor: "#f08486" }]}
          onPress={() => deleteSite(item.id)}
        >
          <Text style={styles.siteActionButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const displayDate = currentSchedule.date
    ? new Date(currentSchedule.date).toLocaleDateString("vi-VN")
    : "--/--/----";

  const renderFooter = () => {
    if (displayedSchedules.length >= schedules.length) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0c5776" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Đợt Tiêm Chủng</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.buttonContainerTop}>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Text style={styles.addButtonText}>Thêm Đợt Tiêm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainerTop}>
        <TouchableOpacity
          style={styles.editSiteButton}
          onPress={() => navigation.navigate("SiteManagement")}
        >
          <Text style={styles.editSiteButtonText}>Chỉnh sửa Địa điểm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleContainer}>
        <Text style={styles.toggleText}>Hiển thị lịch tiêm cũ</Text>
        <Switch
          value={showPastSchedules}
          onValueChange={() => setShowPastSchedules(!showPastSchedules)}
          trackColor={{ false: "#767577", true: "#0c5776" }}
          thumbColor={showPastSchedules ? "#f8dad0" : "#f4f3f4"}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={displayedSchedules.filter((item) =>
              showPastSchedules ? new Date(item.date) < currentDate : new Date(item.date) >= currentDate
            )}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {showPastSchedules ? "Không có đợt tiêm cũ." : "Không có đợt tiêm mới."}
              </Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreSchedules}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{isEditing ? "Sửa Đợt Tiêm" : "Thêm Đợt Tiêm"}</Text>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.input} onPress={() => setShowVaccineList(true)}>
                <Text style={styles.inputText}>
                  {currentSchedule.vaccine_name
                    ? `${currentSchedule.vaccine_name} (${currentSchedule.vaccine_type_name})`
                    : "Chọn vaccine"}
                </Text>
              </TouchableOpacity>
              {showVaccineList && (
                <View style={styles.dropdownContainer}>
                  <FlatList
                    data={vaccines}
                    renderItem={renderVaccineItem}
                    keyExtractor={(item) => item.id.toString()}
                    ListEmptyComponent={<Text style={styles.emptyText}>Không có vaccine</Text>}
                  />
                  <TouchableOpacity
                    style={[styles.closeButton, styles.dropdownCloseButton]}
                    onPress={() => setShowVaccineList(false)}
                  >
                    <Text style={styles.closeButtonText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Ngày (YYYY-MM-DD)"
                value={currentSchedule.date}
                onChangeText={(text) => setCurrentSchedule({ ...currentSchedule, date: text })}
              />
              <Text style={styles.inputHint}>VD: 2025-06-02</Text>

              <TouchableOpacity style={styles.input} onPress={() => setShowSiteList(true)}>
                <Text style={styles.inputText}>
                  {currentSchedule.site_name ? currentSchedule.site_name : "Chọn địa điểm"}
                </Text>
              </TouchableOpacity>
              {showSiteList && (
                <View style={styles.dropdownContainer}>
                  <FlatList
                    data={sites}
                    renderItem={renderSiteItem}
                    keyExtractor={(item) => item.id.toString()}
                    ListEmptyComponent={<Text style={styles.emptyText}>Không có địa điểm</Text>}
                  />
                  <TouchableOpacity
                    style={[styles.closeButton, styles.dropdownCloseButton]}
                    onPress={() => setShowSiteList(false)}
                  >
                    <Text style={styles.closeButtonText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Số lượng slot"
                value={currentSchedule.slot_count}
                onChangeText={(text) => setCurrentSchedule({ ...currentSchedule, slot_count: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#0c5776" }]}
                onPress={saveSchedule}
              >
                <Text style={styles.modalButtonText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#f08486" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={siteModalVisible}
        onRequestClose={() => setSiteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{isEditingSite ? "Sửa Địa điểm" : "Thêm Địa điểm"}</Text>
            <View style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder="Tên địa điểm"
                value={currentSite.name}
                onChangeText={(text) => setCurrentSite({ ...currentSite, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Địa chỉ"
                value={currentSite.address}
                onChangeText={(text) => setCurrentSite({ ...currentSite, address: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                value={currentSite.phone}
                onChangeText={(text) => setCurrentSite({ ...currentSite, phone: text })}
                keyboardType="phone-pad"
              />
              {!isEditingSite && (
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#0c5776", marginTop: 12 }]}
                  onPress={saveSite}
                >
                  <Text style={styles.modalButtonText}>Thêm</Text>
                </TouchableOpacity>
              )}
              <FlatList
                data={sites}
                renderItem={renderSiteListItem}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={<Text style={styles.emptyText}>Không có địa điểm</Text>}
              />
            </View>
            {isEditingSite && (
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#0c5776" }]}
                  onPress={saveSite}
                >
                  <Text style={styles.modalButtonText}>Lưu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#f08486" }]}
                  onPress={() => setSiteModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#6a97a4" },
  header: {
    height: 120,
    backgroundColor: "#0c5776",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    zIndex: 1,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  backButton: { padding: 10, marginTop: 30 },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 30,
  },
  placeholder: { width: 44 },
  buttonContainerTop: { paddingHorizontal: 16, paddingVertical: 8 },
  addButton: {
    backgroundColor: "#d4f0f0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: { fontSize: 16, color: "#021b42", fontWeight: "bold" },
  editSiteButton: {
    backgroundColor: "#d4f0f0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  editSiteButtonText: { fontSize: 16, color: "#021b42", fontWeight: "bold" },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#6a97a4",
  },
  toggleText: { fontSize: 16, color: "#021b42" },
  contentContainer: { flex: 1 },
  listContainer: { padding: 16, paddingBottom: 20 },
  itemCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#f8dad0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  itemInfo: { flex: 1 },
  itemText: { fontSize: 16, color: "#021b42", marginBottom: 6 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  emptyText: { fontSize: 16, color: "#021b42", textAlign: "center", marginTop: 20 },
  loader: { marginVertical: 20 },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#021b42",
    marginBottom: 16,
    textAlign: "center",
  },
  modalContent: { maxHeight: 300 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: "#021b42",
  },
  inputText: { fontSize: 16, color: "#021b42" },
  inputHint: { fontSize: 12, color: "#666", marginBottom: 12, marginLeft: 10 },
  dropdownContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
    zIndex: 10,
  },
  dropdownCloseButton: { marginTop: 8, alignSelf: "center" },
  listItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  listItemText: { fontSize: 16, color: "#021b42" },
  closeButton: {
    padding: 10,
    alignItems: "center",
    backgroundColor: "#d4f0f0",
    borderRadius: 8,
  },
  closeButtonText: { fontSize: 16, color: "#021b42", fontWeight: "bold" },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    zIndex: 1,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  siteListItem: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#f8dad0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  siteInfo: { flex: 1 },
  siteListItemText: { fontSize: 16, color: "#021b42", marginBottom: 6 },
  siteActionButtons: { flexDirection: "row", justifyContent: "flex-end" },
  siteActionButton: {
    padding: 8,
    borderRadius: 8,
    width: 50,
    alignItems: "center",
    marginLeft: 8,
  },
  siteActionButtonText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
});

export default InjectionManagement;