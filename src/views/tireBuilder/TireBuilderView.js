import PropTypes from 'prop-types'
import React, { useState, useEffect, useRef } from 'react'
import { Badge, Button, Col, Dropdown, DropdownButton, Form, Row, Stack } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import SLTLDBConnection from '../../../src/apis/SLTLDBConnection'
import { notifyError } from 'src/utils/toastify'
import { getPidDetail } from '../pidUpdate/httpRequests/pidDetailforPid'
import { connect } from 'react-redux'

import { incrementCountAction } from '../../actions'
import { propTypes } from 'react-bootstrap/esm/Image'
import TireCodeInputComp from 'src/components/bulder/TireCodeInputComp'
import { getSpecDetailsList } from 'src/utils/specDetailCreator'
import SpecDisplayComp from 'src/components/bulder/SpecDisplayComp'
import TtlWgtDisplayComp from 'src/components/bulder/TtlWgtDisplayComp'
//Redux---------------------------------
import { useDispatch, useSelector } from 'react-redux'
import { setActBandWgt } from 'src/redux/band/bandActions'
import { updateSN } from '../../redux/builderFinalData/buildFinalActions'
import { scaleReading } from '../../redux/scale/scaleActions'
import StabilitySetterComp from 'src/components/StabilitySetterComp'
import { rng } from 'src/utils/moveingaverage'
import { BubbleController } from 'chart.js'
import BandWgtScanComp from 'src/components/bulder/BandWgtScanComp'
import { isNumeric } from 'src/utils/isNumeric'
import { getBandWgtTol } from 'src/utils/bandWgtTol'
import { toggleSrtPob } from '../../redux/srtpob/srtpobActions'
const TireBuilderView = () => {
  //States and Refs-----------------------------
  //these 3 states for specAvl,tireCodeAvl and SpecVerMatch
  const [specAvl, setSpecAvl] = useState(false)
  const [tireCodeAvl, setTireCodeAvl] = useState(false)
  const [specVerMatch, setSpecVerMatch] = useState(false)
  const [scaleReadingx, setScaleReadingx] = useState(0)

  //Inputs for tireCode and BandBarcode
  const [tireCodeInput, setTireCodeInput] = useState('1177511') //TireCode input text state
  const [bandBarCodeInput, setBandBarCodeInput] = useState('') //TireCode input text state

  //Band wgt tollerence max and min
  const [minBandTol, setMinBandTol] = useState(0)
  const [maxBandTol, setMaxBandTol] = useState(0)
  //Actual band weight to pass to ttlWgt Calculation componeint
  const [bandwgt_for_calculation, setBandwgt_for_calculation] = useState(0)
  //Get next SN
  const [nxtSN, setNxtSN] = useState(0)

  //Show and hide tirecode input and band input
  const [showBandInputComp, setShowBandInputComp] = useState(false)
  const [showTtlWgtComp, setShowTtlWgtComp] = useState(false)
  //Disable editing tirecode input and band input
  const [stblTimeOutSetting, setStblTimeOutSetting] = useState(1000)
  const [disableInputTireCode, setDisableInputTireCode] = useState(false)
  const [disableInputBand, setDisableInputBand] = useState(false)
  //Refs for TireCode and BandBarcode
  const inputRef = useRef()
  const bandRef = useRef()
  ///////////////////////////////

  //Redux-------------------------------------

  const dispatch = useDispatch()
  const tireDetail = useSelector((state) => state.tireDetails)
  const specDetail = useSelector((state) => state.specDetails)
  const stabilityDetail = useSelector((state) => state.stabilityDetails)
  const tireCodeDetail = useSelector((state) => state.tireCodeDetails)
  const isSrt = useSelector((state) => state.isSrt)
  //Destructre stability Detail
  const { settingWgt, stable, toleranceWgt, ignoreSettingWgt, stableAbsolute } = stabilityDetail

  /////////////////////////////////////////////////////////////
  //Handlers and Methods-------------------------
  //This is passed to TireCodeInputComp.js
  const setTirecodeInputFun = (val) => {
    setTireCodeInput(val)
  }
  //This is passed to BandBarcodeInput.js
  const setBandBarCodeInputFun = (val) => {
    setBandBarCodeInput(val)
  }
  //UseEffects-------------------------
  //Focus input ref whenever page is loaded and refreshed
  useEffect(() => {
    inputRef?.current.focus()
  }, [])

  //Timer for get Next SN(Already added next sn )
  useEffect(() => {
    //Initialize
    const timer = setInterval(async () => {
      SLTLDBConnection.get(`builder/nextsn`).then((res) => {
        setNxtSN(res.data)
      })
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [])

  //Band Input
  useEffect(() => {
    if (bandBarCodeInput.length > 0) {
      //Get the first and last letters
      let firstLetter = bandBarCodeInput.charAt(0)
      let lastLetter = bandBarCodeInput.charAt(bandBarCodeInput.length - 1)
      //chck for S and L first and last charactors
      if ((firstLetter == 's' || firstLetter == 'S') && (lastLetter == 'l' || lastLetter == 'L')) {
        //Get Band Detail
        const bandwgtSpec = tireCodeDetail?.data?.data?.data[0]?.bandwgt
        //Get enterd band wgt
        const bandWgtInput = bandBarCodeInput.slice(1, -1)
        const bandWgt_numeric = parseFloat(bandWgtInput)
        if (bandWgt_numeric) {
          setBandwgt_for_calculation(bandWgt_numeric)
          const maxTolVal = getBandWgtTol(bandwgtSpec) + parseFloat(bandwgtSpec)
          const minTolVal = parseFloat(bandwgtSpec) - getBandWgtTol(bandwgtSpec)
          if (minTolVal > bandWgt_numeric) {
            //Reset band barcode input and band wgt for calculation
            setBandwgt_for_calculation(0)
            notifyError('අඩු බර බෑන්ඩ් එකක්')
            setBandBarCodeInput('')
            dispatch(setActBandWgt(0.0))
            bandRef.current.focus()
          } else if (maxTolVal < bandWgt_numeric) {
            notifyError('වැඩි බර බෑන්ඩ් එකක්')
            //Reset band barcode input and band wgt for calculation
            setBandwgt_for_calculation(0)
            setBandBarCodeInput('')
            dispatch(setActBandWgt(0.0))
            bandRef.current.focus()
          } else {
            //Band Wgt is in the range therfore Show totla wgt component
            setShowTtlWgtComp(true)
            //setDisableInputTireCode(true)
            dispatch(setActBandWgt(bandWgt_numeric))
          }
        }
      } else {
        setShowTtlWgtComp(false) //Hide ttlWgt componeint
        dispatch(setActBandWgt(0.0))
      }
    } else {
      dispatch(setActBandWgt(0.0))
    }
  }, [bandBarCodeInput])
  //Scale Reading------------------------------------------------------------------
  const scale = useSelector((state) => state.scaleData)
  var { reading } = scale
  //Fetch from localhost:4000/sc  and store in redux store with timer
  useEffect(() => {
    //Initialize
    const sto = { reading: 0, time: Date.now() }
    localStorage.setItem('cr', JSON.stringify(sto))
    const timer = setInterval(async () => {
      //codes are executed every 200ms
      dispatch(scaleReading())
    }, 200)
    return () => {
      clearInterval(timer)
    }
  }, [])
  //------------------------------------------------------------------
  //UseEffect to show or hide band barcode input text
  /*
  When tirecode length is 8
  if srt tire show totoal wgt
  if band tire 
  first show band scan text. if it is scanned show total wgt  */
  useEffect(() => {
    if (tireCodeInput.length == 8) {
      SLTLDBConnection.get(`sizebasic/gettcatbytirecode/${tireCodeInput.slice(0, 5)}`).then(
        (res) => {
          if (res.data && res.data.rows[0]) {
            switch (res.data.rows[0].tcat) {
              case 1: //SRTTire
                setShowTtlWgtComp(true)
                setShowBandInputComp(false)
                setDisableInputTireCode(true)
                dispatch(toggleSrtPob(true))
                return
              case 2: //POB Tire
                setShowTtlWgtComp(false)
                setShowBandInputComp(true)
                dispatch(toggleSrtPob(false))
                bandRef?.current.focus()
                return
              default:
                setShowTtlWgtComp(false)
                setShowBandInputComp(false)
                return
            }
          }
        },
      )
    }
  }, [tireCodeInput])

  //Get the band wgt min and max tollerences
  useEffect(() => {
    if (tireCodeDetail) {
      const bandwgtSpec = tireCodeDetail?.data?.data?.data[0]?.bandwgt
    }
  }, [tireCodeDetail])

  return (
    <Row
      style={{
        backgroundColor: !stableAbsolute && 'lightgray',
      }}
    >
      <Col sm={3}>
        <div style={{ marginTop: '50px', marginRight: 0 }}>
          <SpecDisplayComp />
        </div>
        <TireCodeInputComp
          inputRef={inputRef}
          tireCodeInput={tireCodeInput}
          onTireCodeChange={setTirecodeInputFun}
          disableInputTireCode={disableInputTireCode}
          onBandBarcodeChange={setBandBarCodeInputFun}
        />
        <div className="m-3"></div>
        {showBandInputComp && (
          <BandWgtScanComp
            bandRef={bandRef}
            bandBarCodeInput={bandBarCodeInput}
            onBandBarcodeChange={setBandBarCodeInputFun}
            disableInputBand={disableInputBand}
          />
        )}
      </Col>
      <Col sm={3}></Col>
      <Col sm={3}>
        {showTtlWgtComp && (
          <div className="mx-auto" style={{ marginTop: '50px', marginRight: 0 }}>
            <TtlWgtDisplayComp bandwgt_for_calculation={bandwgt_for_calculation} />
          </div>
        )}
        <div className="col text-center mt-5">
          <h1>
            <Badge bg="secondary">{nxtSN}</Badge>
          </h1>
        </div>
      </Col>
      <StabilitySetterComp />
    </Row>
  )
}

export default TireBuilderView
