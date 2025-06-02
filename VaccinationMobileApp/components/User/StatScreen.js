import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Stat from './Stat';

const StatScreen = () => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://192.168.4.41:8000/stats/')  // hoặc IP LAN nếu dùng thiết bị thật
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Báo cáo thống kê</Text>

      <Stat title="Tổng số người đã tiêm" value={statsData.total_vaccinated.toString()} />

      <Stat
        title="Tỷ lệ hoàn thành lịch tiêm"
        value={`${statsData.completion_rate}%`}
      />

      <Text style={styles.subHeading}>Vaccine phổ biến</Text>
      {statsData.popular_vaccines.map((vaccine, index) => (
        <Stat
          key={index}
          title={vaccine.name}
          value={vaccine.count.toString()}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#024b6d',
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
