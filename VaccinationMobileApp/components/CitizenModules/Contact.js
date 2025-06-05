import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import { database, ref, onValue, push, set, update } from "../../components/Home/firebase";

console.log("Database instance:", database);

const Contact = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const userIdRef = useRef(null);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      console.log("Token:", token); // Debug token
      if (!token) throw new Error("Không tìm thấy token.");

      const response = await authApis(token).get(endpoints.currentUser);
      if (response.status === 200) {
        const userData = response.data;
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        console.log("Current User:", userData);
        return userData; // Trả về dữ liệu người dùng
      } else {
        throw new Error("Không thể lấy thông tin người dùng.");
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin người dùng:", error);
      return null;
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      const userData = await fetchCurrentUser(); // Lấy dữ liệu trực tiếp từ hàm
      if (!userData || !userData.id || !userData.username) {
        console.error("Không tìm thấy thông tin người dùng hợp lệ sau khi tải.");
        return;
      }

      const userId = userData.id;
      const username = userData.username;
      userIdRef.current = userId;

      if (!database) {
        console.error("Database is not initialized!");
        return;
      }

      const messagesRef = ref(database, `chats/${userId}`);
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messageList = Object.keys(data)
            .map((key) => ({
              id: key,
              ...data[key],
              is_user: data[key].sender === username,
              timestamp: data[key].timestamp
                ? new Date(data[key].timestamp).toISOString()
                : new Date().toISOString(),
            }))
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          setMessages(messageList);
          scrollToBottom();
        } else {
          setMessages([]);
        }
      });

      return () => unsubscribe();
    };

    initializeChat();
  }, []);

  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    try {
      const userData = await fetchCurrentUser(); // Lấy lại userData để đảm bảo thông tin hiện tại
      if (!userData || !userData.id || !userData.username) {
        console.error("Không tìm thấy thông tin người dùng khi gửi tin nhắn.");
        return;
      }

      const userId = userData.id;
      const username = userData.username;

      setInputText("");
      setIsTyping(true);

      const userMessage = {
        text: trimmedText,
        sender: username,
        timestamp: Date.now(),
        is_user: true,
      };

      const newMessageRef = ref(database, `chats/${userId}`);
      const newMessageKey = push(newMessageRef);
      await set(newMessageKey, userMessage);

      const staffChatRef = ref(database, "staff_chats");
      const queryRef = ref(database, `staff_chats`);
      onValue(queryRef, async (snapshot) => {
        const data = snapshot.val();
        let found = false;
        if (data) {
          for (const chatId in data) {
            if (data[chatId].user_id === userId) {
              await update(ref(database, `staff_chats/${chatId}`), {
                last_message: trimmedText,
                timestamp: Date.now(),
              });
              found = true;
              break;
            }
          }
        }
        if (!found) {
          const newStaffChatRef = push(staffChatRef);
          await set(newStaffChatRef, {
            user_id: userId,
            user_name: username,
            last_message: trimmedText,
            timestamp: Date.now(),
          });
        }
      }, { onlyOnce: true });

      setIsTyping(false);
      scrollToBottom();
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: "Có lỗi xảy ra, vui lòng thử lại sau!",
        is_user: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.is_user ? styles.userMessage : styles.staffMessage,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.is_user ? styles.userMessageText : styles.staffMessageText,
        ]}
      >
        {item.text}
      </Text>
      <Text
        style={[
          styles.timestamp,
          item.is_user ? styles.userTimestamp : styles.staffTimestamp,
        ]}
      >
        {new Date(item.timestamp).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Liên hệ hỗ trợ</Text>
          <Text style={styles.headerSubtitle}>Chat với nhân viên</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {messages.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bắt đầu trò chuyện ngay!</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        showsVerticalScrollIndicator={false}
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.typingIndicator}>
            <View style={[styles.typingDot, { animationDelay: "0ms" }]} />
            <View style={[styles.typingDot, { animationDelay: "150ms" }]} />
            <View style={[styles.typingDot, { animationDelay: "300ms" }]} />
          </View>
          <Text style={styles.typingText}>Nhân viên đang trả lời...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Nhập tin nhắn của bạn..."
          multiline
          maxLength={500}
          editable={!isTyping}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={[
            styles.sendButton,
            (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
          ]}
          disabled={!inputText.trim() || isTyping}
        >
          {isTyping ? (
            <ActivityIndicator size={20} color="#0c5776" />
          ) : (
            <MaterialCommunityIcons name="send" size={24} color="#0c5776" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
    fontStyle: "italic",
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 18,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  userMessage: {
    backgroundColor: "#0c5776",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  staffMessage: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#fff",
  },
  staffMessageText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: "#fff",
    textAlign: "right",
  },
  staffTimestamp: {
    color: "#666",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0c5776",
    marginHorizontal: 2,
    opacity: 0.4,
  },
  typingText: {
    color: "#666",
    fontStyle: "italic",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  sendButton: {
    padding: 10,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default Contact;