import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, ActivityIndicator, Alert, View, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Stat from './Stat';
import { BarChart, PieChart } from 'react-native-chart-kit';

const StatScreen = ({ navigation }) => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://192.168.2.224:8000/stats/')  // hoặc IP LAN nếu dùng thiết bị thật
      .then((response) => {
        if (!response.ok) throw new Error('Lỗi khi lấy dữ liệu');
        return response.json();
      })
      .then((data) => {
        setStatsData(data);
        setLoading(false);
      })
      .catch((error) => {
        Alert.alert("Lỗi", error.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 100 }} />;

  if (!statsData) return <Text>Không có dữ liệu</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo thống kê</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Stat title="Tổng số người đã tiêm" value={statsData.total_vaccinated.toString()} />

        <Stat
          title="Tỷ lệ hoàn thành lịch tiêm"
          value={`${statsData.completion_rate}%`}
        />

        <Text style={styles.subHeading}>Biểu đồ tỷ lệ hoàn thành lịch tiêm</Text>
        <View>
          <PieChart
            data={[
              {
                name: 'Hoàn thành',
                population: statsData.completion_rate,
                color: '#4a90e2', // Xanh dịu
                legendFontColor: '#333',
                legendFontSize: 14,
              },
              {
                name: 'Chưa hoàn thành',
                population: 100 - statsData.completion_rate,
                color: '#b0bec5', // Xám nhạt
                legendFontColor: '#333',
                legendFontSize: 14,
              },
            ]}
            width={Dimensions.get('window').width - 32}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              backgroundGradientFrom: '#f7f7f7',
              backgroundGradientTo: '#f7f7f7',
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        <Text style={styles.subHeading}>Vaccine phổ biến</Text>
        {statsData.popular_vaccines.map((vaccine, index) => (
          <Stat
            key={index}
            title={vaccine.name}
            value={vaccine.count.toString()}
          />
        ))}

        <Text style={styles.subHeading}>Biểu đồ vaccine phổ biến</Text>
        <View>
          <BarChart
            data={{
              labels: statsData.popular_vaccines.map(v => v.name),
              datasets: [
                {
                  data: statsData.popular_vaccines.map(v => v.count),
                },
              ],
            }}
            width={Dimensions.get('window').width - 32}
            height={220}
            yAxisLabel=""
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f7f7f7',
              backgroundGradientTo: '#f7f7f7',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(2, 75, 109, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            segments={2}
            yAxisInterval={1}
            fromZero={true}
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6a97a4',
  },
  header: {
    height: 120,
    backgroundColor: '#0c5776',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  backButton: {
    padding: 10,
    marginTop: 30,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 30,
  },
  placeholder: {
    width: 24,
  },
  scrollContainer: {
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  subHeading: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
    color: '#0277bd',
  },
});

export default StatScreen;