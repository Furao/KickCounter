import React from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions, StatusBar} from 'react-native';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryLabel } from "victory-native";
import moment from 'moment';
import * as SplashScreen from 'expo-splash-screen';
import GestureRecognizer, {swipeDirections} from 'react-native-swipe-gestures';

const screenWidth = Dimensions.get("window").width;

var Datastore = require('react-native-local-mongodb')
  , db = new Datastore({ filename: 'asyncStorageKey', autoload: true });

function EndButton(props) {
  const isCounting = props.isCounting;
  const onPress = props.onPress;
  if (isCounting) {
    return <Button
        onPress={onPress}
        title="Stop Counting"
        color="#2eb872"
      />;
  }
  return null;
}

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
      appIsReady: false,
      timeoutID: 0
    };
    this.hourFinished = this.hourFinished.bind(this);
    this.onSwipe = this.onSwipe.bind(this);
  }

  checkDB() {
    var obj = this;
    db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
      if(docs.length) {
        db.count({}, function (err, count) {
          obj.setState({
            entries: count
          });
        });
        if(docs[0].active == 1){
          let start_time = docs[0].date;
          var curr_time = new Date();
          var time_left = curr_time-start_time-(3600000);
          if(time_left>0)
          {
            obj.hourFinished(docs[0]._id);
          }
          else
          {
            var myTimeoutID;
            myTimeoutID = window.setTimeout(obj.hourFinished, Math.abs(time_left), docs[0]._id);
            obj.setState({
              timeoutID: myTimeoutID
            });
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
      SplashScreen.hideAsync();
    });
  }

  hourFinished(id) {
    Alert.alert("Finished counting")
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
        if(docs[0].active == 1){
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
        var myTimeoutID;
        myTimeoutID = window.setTimeout(obj.hourFinished, 3600000, newDoc._id);
        obj.setState({
          timeoutID: myTimeoutID
        });
        obj.setState({
          entries: obj.state.entries+1
        });
        db.persistence.compactDatafile();
      });
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

  stopCounting() {
    var obj = this;
    db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
      if(docs[0].active == 1){
        window.clearTimeout(obj.timeoutID);
        obj.hourFinished(docs[0]._id);
      }
    });
  }

  componentDidMount() {
    // Prevent native splash screen from autohiding
    try {
      SplashScreen.preventAutoHideAsync();
    } catch (e) {
      console.warn(e);
    }
    this.checkDB();
    this.setStateInterval = window.setInterval(() => {
        this.getData();
    }, 500);
  }

    componentWillUnmount() {
      window.clearInterval(this.setStateInterval);
    }

    onSwipe(gestureName, gestureState) {
      const {SWIPE_UP, SWIPE_DOWN, SWIPE_LEFT, SWIPE_RIGHT} = swipeDirections;
      switch (gestureName) {
        case SWIPE_UP:
          break;
        case SWIPE_DOWN:
          break;
        case SWIPE_LEFT:
          if(this.state.skip>0)
          {
            this.onRight()
          }
          break;
        case SWIPE_RIGHT:
          if(this.state.entries>this.state.skip+4)
          {
            this.onLeft()
          }

          break;
      }
    }

    getData() {
      var obj = this;
      db.find({}).sort({ date: -1 }).limit(4).skip(this.state.skip).exec(function (err, docs) {
        if(docs.length){
          const new_data = docs.map((x) => {
            return {date: x.date, kicks: x.kicks.length};
          });
          if((new_data[0].date!=obj.state.data[0].date) || (new_data[0].kicks!=obj.state.data[0].kicks))
          {
            obj.setState({
              data: new_data
            });
          }
      }
      });
  }

  render() {
    const config = {
      velocityThreshold: 0.01,
      directionalOffsetThreshold: 500
    };

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
          <View style = {{height:20}} />
            <EndButton isCounting={this.state.counting} onPress={this.stopCounting.bind(this)}/>
        </View>
        <View style = {styles.flexRow} >
          <Button
            onPress={this.onLeft.bind(this)}
            disabled={this.state.entries<=this.state.skip+4}
            title="<"
            color="#2eb872"
          />
          <Button
            onPress={this.onRight.bind(this)}
            disabled={this.state.skip<=0}
            title=">"
            color="#2eb872"
          />
        </View>
        <GestureRecognizer style={styles.graphView}
       onSwipe={(direction, state) => this.onSwipe(direction, state)}
      config={config}
      >
        <View style = {styles.graphView} >
          <VictoryChart width={screenWidth} domainPadding={20}>
              <VictoryBar
                domain={{y: [0, 40]}}
                data={this.state.data}
                sortKey="date"
                x={(d) => moment(d.date).format("MM/DD") + "\r\n"+ moment(d.date).format("HH:mm:ss")}
                y="kicks"
                labels={({ datum }) => `${datum.kicks}`}
                barWidth={30}
                style={{ data: {fill: "#a3de83"} }}
                labelComponent={
                  <VictoryLabel
                    textAnchor={({ text }) => "middle"}
                  />
                }
              />
            </VictoryChart>

        </View>
                </GestureRecognizer>
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
