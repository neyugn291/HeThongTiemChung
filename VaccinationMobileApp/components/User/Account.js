import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import Styles from "../../components/Home/Styles";

const Account = ({ navigation, route }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const navItems = route.params?.navItems || [
    { icon: "home", label: "Trang chủ", screen: "Home" },
    { icon: "bell-badge", label: "Nhắc lịch tiêm", screen: "Reminders" },
    { icon: "message", label: "Liên hệ", screen: "Contact" },
    { icon: "account", label: "Tài khoản", screen: "Account" },
  ];

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Vui lòng đăng nhập lại!");
      const response = await authApis(token).get(endpoints["currentUser"]);
      setUserData(response.data);
      console.log("Fetched user data:", response.data); // Debug
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData({ first_name: "", last_name: "" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Làm mới dữ liệu khi quay lại từ Profile
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchUserData(); // Gọi lại API mỗi khi trang Account được focus
      // Kiểm tra nếu có dữ liệu cập nhật từ Profile
      if (route.params?.updatedData) {
        setUserData(route.params.updatedData);
        console.log("Updated data from route params:", route.params.updatedData); // Debug
      }
    });
    return unsubscribe;
  }, [navigation, route.params?.updatedData]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  };

  const userFullName = `${userData?.last_name || ""} ${userData?.first_name || ""}`.trim();

  const accountOptions = [
    { icon: "file-document", label: "Điều khoản dịch vụ", screen: "Terms" },
    { icon: "shield-lock", label: "Chính sách quyền riêng tư", screen: "Privacy" },
  ];

  const userActions = [
    { icon: "pencil", label: "Chỉnh sửa tài khoản", action: () => navigation.navigate("Profile") },
    { icon: "lock-reset", label: "Đổi mật khẩu", action: () => navigation.navigate("ChangePassword") },
    { icon: "logout", label: "Đăng xuất", action: handleLogout },
  ];

  return (
    <View style={myStyles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={myStyles.profileCard}>
        {loading ? (
          <Text>Đang tải...</Text>
        ) : (
          <>
            {userData?.avatar ? (
              <Image source={{ uri: userData.avatar }} style={myStyles.avatar} />
            ) : (
              <MaterialCommunityIcons name="account-circle" size={80} color="#fff" />
            )}
            <Text style={myStyles.userName}>{userFullName}</Text>
          </>
        )}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={myStyles.section}>
          {userActions.map((item, index) => (
            <TouchableOpacity key={index} style={myStyles.optionItem} onPress={item.action}>
              <View style={myStyles.row}>
                <MaterialCommunityIcons name={item.icon} size={24} color="#021b42" />
                <Text style={myStyles.optionLabel}>{item.label}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#021b42" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={myStyles.section}>
          {accountOptions.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={myStyles.optionItem}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <View style={myStyles.row}>
                <MaterialCommunityIcons name={item.icon} size={24} color="#021b42" />
                <Text style={myStyles.optionLabel}>{item.label}</Text>
              </View>
              {item.screen && <MaterialCommunityIcons name="chevron-right" size={24} color="#021b42" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={Styles.bottomNav}>
        {navItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={Styles.navItem}
            onPress={() => navigation.navigate(item.screen, { navItems })}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={route?.name === item.screen ? "#021b42" : "#174171"}
            />
            <Text
              style={[
                Styles.navLabel,
                route?.name === item.screen && Styles.activeNav,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const myStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6a97a4",
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
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  section: {
    backgroundColor: "#f8dad0",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f9ccbd",
  },
  optionLabel: {
    fontSize: 16,
    marginLeft: 10,
    color: "#021b42",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default Account;