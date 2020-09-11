import React from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions, StatusBar, TouchableOpacity, YellowBox, Image} from 'react-native';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryLabel } from "victory-native";
import moment from 'moment';
import * as SplashScreen from 'expo-splash-screen';
import GestureRecognizer, {swipeDirections} from 'react-native-swipe-gestures';
import _ from 'lodash';


YellowBox.ignoreWarnings(['Setting a timer']);
const _console = _.clone(console);
console.warn = message => {
  if (message.indexOf('Setting a timer') <= -1) {
    _console.warn(message);
  }
};

SplashScreen.preventAutoHideAsync();

const screenWidth = Dimensions.get("window").width;

var Datastore = require('react-native-local-mongodb')
  , db = new Datastore({ filename: 'asyncStorageKey', autoload: true });

function EndTouchableOpacity(props) {
  const isCounting = props.isCounting;
  const onPress = props.onPress;
  if (isCounting) {
    return <TouchableOpacity
      style={styles.CancelButtonStyle}
      activeOpacity = { 0.3 }
      onPress={onPress}
   >
   <Text style={styles.TextStyle}> Stop Counting </Text>
   </TouchableOpacity>;
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
      appIsReady: 0,
      splashScreenShowing: true,
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
      obj.setState({ appIsReady: 1 });
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

  actuallyStopCounting() {
    var obj = this;
    db.find({}).sort({ date: -1 }).limit(1).exec(function (err, docs) {
      if(docs[0].active == 1){
        window.clearTimeout(obj.timeoutID);
        obj.hourFinished(docs[0]._id);
      }
    });
  }

  stopCounting() {
    Alert.alert(
      'Stop Counting Session?',
      '',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        { text: 'Yes', onPress:this.actuallyStopCounting.bind(this) }
      ],
      { cancelable: false }
    );
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
    }, 250);
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
      if(this.state.splashScreenShowing) {
        if(this.state.appIsReady == 2) {
          SplashScreen.hideAsync();
          this.setState({splashScreenShowing: false})
        }
        if(this.state.appIsReady == 1) {
          this.setState({
            appIsReady: 2
          });
        }
      }
  }

  render() {
    const config = {
      velocityThreshold: 0.01,
      directionalOffsetThreshold: 500
    };

    if (!this.state.appIsReady) {
      return null;
    }
    let chart;
    if(this.state.data[0].date == 0){
      chart = <Image style={{width: 150, height: 150, opacity: 0.25}}
          source={require('./assets/chart_bar.png')}
        />
    }
    else {
      chart = <VictoryChart width={screenWidth} domainPadding={20}>
          <VictoryBar
            domain={{y: [0, 40]}}
            data={this.state.data}
            sortKey="date"
            x={(d) => moment(d.date).format("MM/DD") + "\r\n"+ moment(d.date).format("hh:mm A")}
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
        </VictoryChart>;
    }
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Baby Kick Counter</Text>

        <View style = {styles.actionBox} >
        <TouchableOpacity
          style={styles.SubmitButtonStyle}
          activeOpacity = { 0.3 }
          onPress={ this.onKicked.bind(this) }
       >
       <Text style={styles.TextStyle}> {this.state.kickButton_string} </Text>

      </TouchableOpacity>
        </View>
          <View style = {{height:20}} />
          <View style = {styles.stopBox} >
            <EndTouchableOpacity isCounting={this.state.counting} onPress={this.stopCounting.bind(this)} />
          </View>
        <View style = {styles.flexRow} >
        <TouchableOpacity
          style={this.state.entries<=this.state.skip+4 ? styles.DisabledButton : styles.ArrowButtonStyle}
          activeOpacity = { 0.3 }
          onPress={ this.onLeft.bind(this) }
          disabled={this.state.entries<=this.state.skip+4}
       >
       <Text style={styles.TextStyle}> {"<"} </Text>

      </TouchableOpacity>
      <TouchableOpacity
        style={this.state.skip<=0 ? styles.DisabledButton : styles.ArrowButtonStyle}
        activeOpacity = { 0.3 }
        onPress={ this.onRight.bind(this) }
        disabled={this.state.skip<=0}
     >
     <Text style={styles.TextStyle}> {">"} </Text>

    </TouchableOpacity>
        </View>
        <GestureRecognizer
          style={styles.graphView}
          onSwipe={(direction, state) => this.onSwipe(direction, state)}
          config={config}
        >
          <View style ={styles.graphView}>
            {chart}
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
    flex: 2,
    backgroundColor: '#feffea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBox: {
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
  SubmitButtonStyle: {
    width:120,
    height:120,
    backgroundColor:'#2eb872',
    borderRadius:60,
    alignItems:'center',
    justifyContent:'center',
    borderWidth: 1,
    borderColor: '#fff'
  },
  CancelButtonStyle: {
    width:80,
    height:80,
    backgroundColor:'#2eb872',
    borderRadius:40,
    alignItems:'center',
    justifyContent:'center',
    borderWidth: 1,
    borderColor: '#fff'
  },
  ArrowButtonStyle: {
    width:36,
    height:36,
    backgroundColor:'#2eb872',
    borderRadius:18,
    alignItems:'center',
    justifyContent:'center',
    borderWidth: 1,
    borderColor: '#fff'
  },
  DisabledButton: {
    width:36,
    height:36,
    backgroundColor:'#bfbfbf',
    borderRadius:18,
    alignItems:'center',
    justifyContent:'center',
    borderWidth: 1,
    borderColor: '#fff'
  },
  TextStyle:{
      color:'#fff',
      textAlign:'center',
  }
});
