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
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { database, ref, onValue, push, set, update } from "../../components/Home/firebase"; // Import các hàm modular

const StaffChatDetail = ({ route, navigation }) => {
  const { userId, userName } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef(null);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    const messagesRef = ref(database, `chats/${userId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
            timestamp: data[key].timestamp
              ? new Date(data[key].timestamp).toISOString()
              : new Date().toISOString(),
          }))
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        setMessages(messageList);
        scrollToBottom();
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    const staffMessage = {
      text: trimmedText,
      sender: "Staff",
      timestamp: Date.now(),
      is_user: false,
    };

    setInputText("");

    // Gửi tin nhắn vào chats
    const messagesRef = ref(database, `chats/${userId}`);
    const newMessageKey = push(messagesRef);
    await set(newMessageKey, staffMessage);

    // Cập nhật staff_chats với tin nhắn mới
    const staffChatRef = ref(database, "staff_chats");
    const queryRef = ref(database, `staff_chats`);
    onValue(queryRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let found = false;
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
        if (!found) {
          const newStaffChatRef = push(staffChatRef);
          await set(newStaffChatRef, {
            user_id: userId,
            user_name: userName,
            last_message: trimmedText,
            timestamp: Date.now(),
          });
        }
      }
    }, { onlyOnce: true });
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
        {item.sender ? `${item.sender}: ` : ""}{item.text}
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
        <Text style={styles.headerTitle}>{userName}</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Nhập phản hồi..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          disabled={!inputText.trim()}
        >
          <MaterialCommunityIcons name="send" size={24} color="#0c5776" />
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
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  staffMessage: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
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
    textAlign: "left",
  },
  staffTimestamp: {
    color: "#666",
    textAlign: "right",
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

export default StaffChatDetail;