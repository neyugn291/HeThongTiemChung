import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { database, ref, onValue } from "../../components/Home/firebase";

const StaffChatScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chatsRef = ref(database, "staff_chats");
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatList = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
            timestamp: data[key].timestamp
              ? new Date(data[key].timestamp).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Vừa xong",
          }))
          .sort((a, b) => {
            // Sắp xếp theo thời gian giảm dần
            const timestampA = data[a.id].timestamp || 0;
            const timestampB = data[b.id].timestamp || 0;
            return timestampB - timestampA;
          });
        setChats(chatList);
      } else {
        setChats([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleChatPress = (userId, userName) => {
    navigation.navigate("StaffChatDetail", { userId, userName });
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item.user_id, item.user_name)}
    >
      <View style={styles.chatInfo}>
        <Text style={styles.chatUserName}>{item.user_name}</Text>
        <Text style={styles.chatLastMessage} numberOfLines={1}>
          {item.last_message}
        </Text>
      </View>
      <Text style={styles.chatTimestamp}>{item.timestamp}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#0c5776" style={styles.loading} />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh sách Chat</Text>
        <View style={styles.placeholder} />
      </View>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có cuộc chat nào</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    height: 120,
    backgroundColor: "#0c5776",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    alignItems: "center",
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  chatList: {
    padding: 15,
  },
  chatItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chatInfo: {
    flex: 1,
  },
  chatUserName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#024b6d",
  },
  chatLastMessage: {
    fontSize: 14,
    color: "#666",
  },
  chatTimestamp: {
    fontSize: 12,
    color: "#888",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
  },
});

export default StaffChatScreen;