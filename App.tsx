// import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions, StatusBar} from 'react-native';
// import { BarChart} from "react-native-chart-kit";
// import Moment from "react-moment";
import { VictoryBar, VictoryChart, VictoryTheme } from "victory-native";
import moment from 'moment';

const screenWidth = Dimensions.get("window").width;

// Moment.globalFormat = 'D MMM YYYY';

var Datastore = require('react-native-local-mongodb')
  , db = new Datastore({ filename: 'asyncStorageKey', autoload: true });

db.persistence.setAutocompactionInterval(1000)

function checkDB() {
  let num = db.count({}, function (err, count) {
    var i = 0;
    console.log(count);
    var today = new Date();
    today.setMilliseconds(0);
    today.setSeconds(0);
    today.setMinutes(0);
    if(count == 0) {
      console.log("Filling Database");
      db.insert({date: today, kicks: 0});
      for (i = 0; i < 720; i++) {
        db.insert({date: today, kicks: 0});
        today = new Date(today-3600000);
      }
    }
    else {
      db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
        let latest_hour = docs[0].date
        console.log(latest_hour);
        console.log(today);
        if(latest_hour.getTime() != today.getTime()) {
          console.log("Latest hour is not now");
          let hours_between=(today-latest_hour)/3600000;

          for(i = 0; i<(hours_between);i++){
            console.log("adding empty hour");
            latest_hour = new Date(latest_hour+3600000);
            db.insert({date: latest_hour, kicks: 0});
          }
        }
      });
    }
  });
}

function kicked() {
  var today = new Date();
  today.setMilliseconds(0);
  today.setSeconds(0);
  today.setMinutes(0);
  // var curr_time = <Moment element={Text}>today</Moment>;
  db.find({date: today}, function (err, docs) {

    if(docs.length == 0) {
      db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
        let latest_hour = docs[0].date
        let hours_between=(today-latest_hour)/3600000;

        var i = 0;
        for(i = 0; i<(hours_between-1);i++){
          latest_hour = new Date(latest_hour+3600000);
          db.insert({date: latest_hour, kicks: 0});
        }
        console.log("No kicks logged at " + today);
        db.insert({kicks: 1, date: today});
      });
    }
    else {
      db.update({date: today}, { $inc: { kicks: 1 } }, {});
    }
  })

  Alert.alert("Added a baby kick")

}


export default class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      data: [{date:"0", kicks: 0},
              {date:"0", kicks: 0}],
      skip: 0
    };
    this.getData();
    checkDB();
  }

  onLeft() {
    console.log("onLeft");
    let cur_val = this.state.skip+4;
    console.log("new skip: " + cur_val);
    this.setState({
      skip: cur_val
    });
  }

  onRight() {
    let cur_val = this.state.skip-4;
    this.setState({
      skip: cur_val
    });
  }

  componentDidMount() {
      this.setStateInterval = window.setInterval(() => {
        this.getData();
        // console.log(newData);
        // this.setState({
        //   data: newData
        // });
      }, 250);
    }

    componentWillUnmount() {
      window.clearInterval(this.setStateInterval);
    }


// {(d) => moment(d.date).format('MM/DD ha')}
    getData() {
      var obj = this;
      db.find({}).sort({ date: -1 }).skip(this.state.skip).limit(4).exec(function (err, docs) {
        // console.log(docs);
        // data = docs
        obj.setState({
          data: docs
        });
      });

    // const data = [
    //   { date: "08/24\r\n1pm", kicks: 10 },
    //   { date: "08/24\r\n2pm", kicks: 8 },
    //   { date: "08/24\r\n3pm", kicks: 16 },
    //   { date: "08/24\r\n4pm", kicks: 32 }
    // ];
    // let data = await db.find({}).sort({ date: -1 }).limit(2).exec(function (err, docs) {
    //   // console.log(docs);
    //   // data = docs
    //   return docs;
    // });
    // console.log(data);
    // return paginateData();
    // let data = [
    //   { date: "08/24\r\n1pm", kicks: 10 },
    //   { date: "08/24\r\n2pm", kicks: 8 },
    //   { date: "08/24\r\n3pm", kicks: 16 },
    //   { date: "08/24\r\n4pm", kicks: 32 }
    // ];
    // console.log(data);
    // return data;
  }

  render() {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Baby Kick Counter</Text>

        <View style = {styles.actionBox} >
          <Button
            onPress={kicked}
            title="Baby Kicked"
            color="#2eb872"
          />
        </View>
        <View style = {styles.flexRow} >
          <Button
            onPress={this.onLeft.bind(this)}
            title="Left"
            color="#2eb872"
          />
          <Button
            onPress={this.onRight.bind(this)}
            disabled={this.state.skip<=0}
            title="Right"
            color="#2eb872"
          />
        </View>
        <View style = {styles.graphView} >
          <VictoryChart width={screenWidth} theme={VictoryTheme.material}>
              <VictoryBar domain={{y: [0, 40]}} alignment="start" data={this.state.data} sortKey="date" x={(d) => moment(d.date).format("MM/DD") + "\r\n"+ moment(d.date).format("h a")} y="kicks" />
            </VictoryChart>
        </View>
        <View style = {{height:30}} />
      </View>
    );
  }
}

// export default function App() {
//
// }

const styles = StyleSheet.create({
  container: {
    flex: 5,
    backgroundColor: '#feffea',
    // alignItems: 'center',
  },
  actionBox: {
    flex: 1,
    backgroundColor: '#feffea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphView: {
    flex: 3,
    backgroundColor: '#feffea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#feffea',
    padding: 5
  },
  title: {
    textAlign: 'center',
    width: screenWidth,
    color: 'white',
    backgroundColor: '#a3de83',
    fontSize: 30,
    padding: 5,
  },
});
