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
  Alert,
  ActivityIndicator,
  Modal,
  Clipboard,
} from "react-native";
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showPrompts, setShowPrompts] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState("");
  const [currentUserMessageId, setCurrentUserMessageId] = useState(null);
  const [useWebViewMode, setUseWebViewMode] = useState(true); // Toggle giữa WebView và API
  const flatListRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["chatMessages"]);
      
      if (response.data && Array.isArray(response.data)) {
        setMessages(response.data);
        if (response.data.length > 0) {
          setShowPrompts(false);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải lịch sử tin nhắn:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    try {
      const token = await AsyncStorage.getItem("token");

      // Kiểm tra câu hỏi trước
      const checkResponse = await authApis(token).post(endpoints["checkQuestion"], {
        question: trimmedText,
      });

      if (!checkResponse.data.allowed) {
        Alert.alert(
          "Câu hỏi không hợp lệ",
          checkResponse.data.message || "Chỉ hỗ trợ câu hỏi về vắc-xin hoặc sức khỏe.",
          [{ text: "OK" }]
        );
        return;
      }

      setShowPrompts(false);
      setInputText("");
      setIsTyping(true);

      if (useWebViewMode) {
        // Sử dụng WebView mode
        const response = await authApis(token).post(endpoints["aiChat"], {
          message: trimmedText,
        });

        if (response.data && response.data.use_webview) {
          // Thêm tin nhắn user vào danh sách
          setMessages(prevMessages => [...prevMessages, response.data.user_message]);
          
          // Mở WebView với ChatGPT
          setCurrentUserMessageId(response.data.user_message.id);
          setWebViewUrl(response.data.chatgpt_url);
          setShowWebView(true);
          setIsTyping(false);
        }
      } else {
        // Sử dụng Free API mode
        const response = await authApis(token).post(endpoints["aiChatFree"], {
          message: trimmedText,
        });

        if (response.data && response.data.user_message && response.data.ai_response) {
          setMessages(prevMessages => [
            ...prevMessages,
            response.data.user_message,
            response.data.ai_response,
          ]);
        }
        setIsTyping(false);
      }

    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      setIsTyping(false);
      
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: error.response?.data?.detail || "Có lỗi xảy ra, vui lòng thử lại sau!",
        is_user: false,
        timestamp: new Date().toISOString(),
        sender: null
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }
  };

  const handleWebViewResponse = async (aiResponse) => {
    if (!aiResponse.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập phản hồi từ AI");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).post(endpoints["saveAiResponse"], {
        ai_response: aiResponse,
        user_message_id: currentUserMessageId,
      });

      if (response.data && response.data.ai_message) {
        setMessages(prevMessages => [...prevMessages, response.data.ai_message]);
      }

      setShowWebView(false);
      setWebViewUrl("");
      setCurrentUserMessageId(null);
    } catch (error) {
      console.error("Lỗi khi lưu phản hồi AI:", error);
      Alert.alert("Lỗi", "Không thể lưu phản hồi AI");
    }
  };

  const handlePromptPress = (promptText) => {
    setInputText(promptText);
    setShowPrompts(false);
  };

  const toggleMode = () => {
    setUseWebViewMode(!useWebViewMode);
    Alert.alert(
      "Đã chuyển chế độ",
      useWebViewMode 
        ? "Chuyển sang chế độ API miễn phí (có thể chậm hơn)" 
        : "Chuyển sang chế độ WebView ChatGPT"
    );
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.is_user ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <Text style={[
        styles.messageText,
        item.is_user ? styles.userMessageText : styles.aiMessageText
      ]}>
        {item.text}
      </Text>
      <Text style={[
        styles.timestamp,
        item.is_user ? styles.userTimestamp : styles.aiTimestamp
      ]}>
        {new Date(item.timestamp).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );

  const renderWebViewModal = () => (
    <Modal
      visible={showWebView}
      animationType="slide"
      onRequestClose={() => setShowWebView(false)}
    >
      <View style={styles.webViewContainer}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            onPress={() => setShowWebView(false)}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>ChatGPT</Text>
          <TouchableOpacity
            onPress={() => {
              Alert.prompt(
                "Nhập phản hồi từ AI",
                "Copy phản hồi từ ChatGPT và paste vào đây:",
                [
                  { text: "Hủy", style: "cancel" },
                  { 
                    text: "Lưu", 
                    onPress: (text) => handleWebViewResponse(text)
                  }
                ],
                "plain-text"
              );
            }}
            style={styles.saveButton}
          >
            <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <WebView
          source={{ uri: webViewUrl }}
          style={styles.webView}
          onError={() => {
            Alert.alert("Lỗi", "Không thể tải ChatGPT. Vui lòng kiểm tra kết nối internet.");
          }}
        />
        
        <View style={styles.webViewFooter}>
          <Text style={styles.instructionText}>
            💡 Hướng dẫn: Chat với AI trong trang web, sau đó copy phản hồi và nhấn nút lưu ở trên
          </Text>
        </View>
      </View>
    </Modal>
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
          <Text style={styles.headerTitle}>Chat với AI</Text>
          <Text style={styles.headerSubtitle}>
            {useWebViewMode ? "WebView Mode" : "API Mode"}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={toggleMode}
          style={styles.modeButton}
        >
          <MaterialCommunityIcons 
            name={useWebViewMode ? "web" : "api"} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0c5776" />
          <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (flatListRef.current && messages.length > 0) {
              setTimeout(() => {
                flatListRef.current.scrollToEnd({ animated: true });
              }, 100);
            }
          }}
        />
      )}

      {isTyping && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" color="#0c5776" />
          <Text style={styles.typingText}>
            {useWebViewMode ? "Đang mở ChatGPT..." : "AI đang trả lời..."}
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Nhập câu hỏi về vắc-xin, sức khỏe..."
          multiline
          maxLength={500}
          editable={!isTyping}
        />
        <TouchableOpacity 
          onPress={sendMessage} 
          style={[
            styles.sendButton,
            (!inputText.trim() || isTyping) && styles.sendButtonDisabled
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

      {showPrompts && (
        <View style={styles.promptSuggestions}>
          <Text style={styles.sectionTitle}>💡 Gợi ý câu hỏi</Text>
          
          <TouchableOpacity 
            style={styles.promptItem}
            onPress={() => handlePromptPress("Lịch tiêm chủng cho trẻ em từ 0-18 tuổi như thế nào?")}
          >
            <Text style={styles.promptText}>🍼 Lịch tiêm chủng cho trẻ em từ 0-18 tuổi như thế nào?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.promptItem}
            onPress={() => handlePromptPress("Những loại vaccine nào phù hợp cho người lớn tuổi?")}
          >
            <Text style={styles.promptText}>👵 Những loại vaccine nào phù hợp cho người lớn tuổi?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.promptItem}
            onPress={() => handlePromptPress("Cách chăm sóc và theo dõi sau khi tiêm vaccine?")}
          >
            <Text style={styles.promptText}>🏥 Cách chăm sóc và theo dõi sau khi tiêm vaccine?</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderWebViewModal()}
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
  modeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
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
  aiMessage: {
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
  aiMessageText: {
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
  aiTimestamp: {
    color: "#666",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  typingText: {
    marginLeft: 8,
    color: "#666",
    fontStyle: "italic",
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
  promptSuggestions: {
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  sectionTitle: {
    fontSize: 16,
    color: "#0c5776",
    fontWeight: "600",
    marginBottom: 15,
  },
  promptItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  promptText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  // WebView Modal Styles
  webViewContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webViewHeader: {
    height: 100,
    backgroundColor: "#0c5776",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 40,
  },
  closeButton: {
    padding: 8,
  },
  webViewTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  saveButton: {
    padding: 8,
  },
  webView: {
    flex: 1,
  },
  webViewFooter: {
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ChatScreen;