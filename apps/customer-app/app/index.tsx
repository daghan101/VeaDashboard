import { Text, View, StyleSheet } from 'react-native';

export default function CustomerHome() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Customer App Ready</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});
