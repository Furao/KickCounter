import React from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions, StatusBar} from 'react-native';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryLabel } from "victory-native";
import moment from 'moment';
import * as SplashScreen from 'expo-splash-screen';

const screenWidth = Dimensions.get("window").width;

var Datastore = require('react-native-local-mongodb')
  , db = new Datastore({ filename: 'asyncStorageKey', autoload: true });

// db.persistence.setAutocompactionInterval(1000)

// function checkDB() {
//   let num = db.count({}, function (err, count) {
//     var i = 0;
//     console.log(count);
//     var today = new Date();
//     today.setMilliseconds(0);
//     today.setSeconds(0);
//     today.setMinutes(0);
//     if(count == 0) {
//       console.log("Filling Database");
//       db.insert({date: today, kicks: 0});
//       for (i = 0; i < 720; i++) {
//         db.insert({date: today, kicks: 0});
//         today = new Date(today-3600000);
//       }
//     }
//     else {
//       db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
//         let latest_hour = docs[0].date
//         console.log(latest_hour);
//         console.log(today);
//         if(latest_hour.getTime() != today.getTime()) {
//           console.log("Latest hour is not now");
//           let hours_between=(today-latest_hour)/3600000;
//
//           for(i = 0; i<(hours_between);i++){
//             console.log("adding empty hour");
//             latest_hour = new Date(latest_hour+3600000);
//             db.insert({date: latest_hour, kicks: 0});
//           }
//         }
//       });
//     }
//   });
// }

// function kicked() {
//   var today = new Date();
//   today.setMilliseconds(0);
//   today.setSeconds(0);
//   today.setMinutes(0);
//   // var curr_time = <Moment element={Text}>today</Moment>;
//   db.find({date: today}, function (err, docs) {
//
//     if(docs.length == 0) {
//       db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
//         let latest_hour = docs[0].date
//         let hours_between=(today-latest_hour)/3600000;
//
//         var i = 0;
//         for(i = 0; i<(hours_between-1);i++){
//           latest_hour = new Date(latest_hour+3600000);
//           db.insert({date: latest_hour, kicks: 0});
//         }
//         console.log("No kicks logged at " + today);
//         db.insert({kicks: 1, date: today});
//       });
//     }
//     else {
//       db.update({date: today}, { $inc: { kicks: 1 } }, {});
//     }
//   })
//
//   Alert.alert("Added a baby kick")
//
// }


export default class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      data: [{date:"0", kicks: 0},
              {date:"0", kicks: 0}],
      skip: 0,
      entries: 0,
      counting: false,
      kickButton_string: "Start Counting Kicks",
      appIsReady: false
    };
    // this.getData();
    this.hourFinished = this.hourFinished.bind(this);
  }

  async checkDB() {
    var obj = this;
    await db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
      if(docs.length) {
        db.count({}, function (err, count) {
          obj.setState({
            entries: count
          });
        });
        if(docs[0].active == 1){
          let start_time = docs[0].date;
          var curr_time = new Date();
          if(curr_time-start_time > 3*1000)
          {
            obj.hourFinished(docs[0]._id);
          }
          else
          {
            obj.setState({
              counting: true
            });
            obj.setState({
              kickButton_string: "Baby Kicked"
            });
          }

        }
      }
    });
    this.setState({ appIsReady: true }, async () => {
      await SplashScreen.hideAsync();
    });
  }

  hourFinished(id) {
    Alert.alert("Finished hour for counting")
    var obj = this;
    db.update({ _id: id }, { $set: { active: 0 } }, {}, function () {
      db.persistence.compactDatafile();
      obj.setState({
        kickButton_string: "Start Counting Kicks"
      });
      obj.setState({
        counting: false
      });
    });
  }

  onKicked() {
    var obj = this;
    if(this.state.counting)
    {
      db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
        console.log(docs);
        if(docs[0].active == 1){
          console.log("Still counting kicks");
          db.update({ _id: docs[0]._id }, { $push: { kicks: new Date() } }, {}, function () {
            db.persistence.compactDatafile();
          });

        }
      });
    }
    else
    {
      var curr_time = new Date();
      db.insert({date: curr_time, active: 1, kicks: []}, function (err, newDoc) {
        window.setTimeout(obj.hourFinished, 3*1000, newDoc._id);
        obj.setState({
          entries: obj.state.entries+1
        });
        db.persistence.compactDatafile();
      });
      console.log("Start Counting Kicks");
      this.setState({
        kickButton_string: "Baby Kicked"
      });
      this.setState({
        counting: true
      });
    }

  }

  onLeft() {
    var obj = this;
    let cur_val = this.state.skip+4;
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

  async componentDidMount() {
    // Prevent native splash screen from autohiding
    try {
      await SplashScreen.preventAutoHideAsync();
    } catch (e) {
      console.warn(e);
    }
    this.checkDB();
    this.setStateInterval = window.setInterval(() => {
        this.getData();
    }, 250);
  }

    componentWillUnmount() {
      window.clearInterval(this.setStateInterval);
    }


// {(d) => moment(d.date).format('MM/DD ha')}
    getData() {
      var obj = this;
      db.find({}).sort({ date: -1 }).limit(4).skip(this.state.skip).exec(function (err, docs) {
        // console.log(docs);
        // data = docs
        const new_data = docs.map((x) => {
          return {date: x.date, kicks: x.kicks.length};
        });
        obj.setState({
          data: new_data
        });
      });
      if(this.state.counting==true) {
        this.setState({
          kickButton_string: "Baby Kicked"
        });
      }
      else {
        this.setState({
          kickButton_string: "Start Counting Kicks"
        });
      }

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
    if (!this.state.appIsReady) {
      return null;
    }
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Baby Kick Counter</Text>

        <View style = {styles.actionBox} >
          <Button
            onPress={this.onKicked.bind(this)}
            title={this.state.kickButton_string}
            color="#2eb872"
          />
        </View>
        <View style = {styles.flexRow} >
          <Button
            onPress={this.onLeft.bind(this)}
            disabled={this.state.entries<=this.state.skip+4}
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
          <VictoryChart domainPadding={30} width={screenWidth} theme={VictoryTheme.material}>
              <VictoryBar
                domain={{y: [0, 40]}}
                // alignment="start"
                data={this.state.data}
                sortKey="date"
                x={(d) => moment(d.date).format("MM/DD") + "\r\n"+ moment(d.date).format("h:mm:ss a")}
                y="kicks"
                labels={({ datum }) => `${datum.kicks}`}
                barWidth={30}
                labelComponent={
                  <VictoryLabel
                    textAnchor={({ text }) => "middle"}
                  />
                }
              />
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
