import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PaymentSuccess from '../component/Receipt';
import Button from '../component/Button';
import Order from '../component/Order';
import Header from '../component/Header';
import RecoCard from '../component/RecoCard';
import CardPicker from '../component/homeCards/CardPicker';
import { useLocation } from 'react-router-dom';
import { useMemberNo, useSelectedCard } from '../provider/PayProvider';

const Pay = () => {
    const location = useLocation();
    const navigate = useNavigate();
const {selectedCard, setSelectedCard} = useSelectedCard();
    const [recommendData, setRecommendData] = useState(location.state.aiData);
    const [purchaseData, setPurchaseData] = useState(location.state.purchaseData); //구매 정보 데이터

    // console.log(purchaseData.orderNo);
    
    const memberNo = useMemberNo();
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentData, setPaymentData] = useState({}); //결제요청할 데이터 해야함
    
    const [cardCode, setCardCode] = useState(location.state.cardCode);

    // console.log(cardCode);
    // console.log(recommendData); //TODO: 240823 이제 이 데이터 잘라서 페이지에 그려주면 됨

    const [getIsAi, setGetIsAi] = useState(true);
    const [saveType, setSaveType] = useState(null);
    const [cardInfo, setCardInfo] = useState({
        aiCard: null,
        selectedCard: null,
    });

    const [showCardPicker, setShowCardPicker] = useState(false); 
    const [cards, setCards] = useState([]); 

   useEffect(() => {
        if (cardCode) {
            setGetIsAi(false); // 카드 코드가 있으면 선택한 카드 결제
        } else{
            setGetIsAi(true);
        }

        //카드 정보 가져오는 API 호출
        const getCardInfo = async (code) => {
            try {
                const url = 'http://localhost:8091/api/payment/card';
                const data = {
                    cardCode: code, //recommenData 추출 해서 넣기(근데 AI 카드가 아닌 경우에는 선택한 카드코드 줘야 함)
                    memberNo: memberNo
                };
                const response = await axios.post(url, data, {
                    responseType: 'json',
                });
                return response.data;
            } catch (error) {
                console.error(error);
                return {};
            }
        };

        // saveType(useEffect를 따로 분리해야하나?)
         const loadCardData = async () => {
            let aiCardInfo = null;
            let selectedCardInfo = null;

            if (getIsAi) {
                // AI 추천 카드 정보만 가져오기
                aiCardInfo = await getCardInfo(recommendData.recommendCard);
            } 
            else {
                // AI 추천 카드와 선택한 카드 정보 모두 가져오기
                selectedCardInfo = await getCardInfo(cardCode);
                aiCardInfo = await getCardInfo(recommendData.recommendCard);
                
            }
            //데이터 담기
            setCardInfo({
                aiCard: aiCardInfo,
                selectedCard: selectedCardInfo,
            });
            // console.log("===============================");
            // console.log(cardInfo);
            // console.log(aiCardInfo);
            // console.log(selectedCardInfo);

            // saveType 설정
            if (recommendData.benefitType === "할인") {
                setSaveType(0);
            } else if (recommendData.benefitType === "적립") {
                setSaveType(1);
            }
        };

        loadCardData();
    },  [cardCode, recommendData.benefitType, recommendData.recommendCard, getIsAi, memberNo]);



    const getBenefit = { 
        maximumBenefits: recommendData.maximumBenefits,
        benefitType: recommendData.benefitType
    }

    const getPurchase = {
        franchiseName: purchaseData.franchiseName,
        price: purchaseData.purchasePrice,
        product: purchaseData.purchaseItems
    }
    


    
    //TODO: 다른 카드 선택하기 하면 카드 리스트 컴포넌트 불러오고 화면도 바꿔야하고 데이터 값도 바꿔야 하고 OMG~~

   

    //TODO: 실제 결제 요청 정보 담아야 함
    const handlePayment = async () => {

        let cardNo = '';

        //카드 번호 설정
        if (getIsAi) {
            cardNo = cardInfo.aiCard.lastNums;
        } else {
            cardNo = cardInfo.selectedCard.lastNums;
        }

        console.log(cardNo);

        const paymentData = {
            
            orderNo: purchaseData.orderNo, //이전에서 받아와야 함? 
            price: purchaseData.purchasePrice,  //이것도 판매자
            product: purchaseData.purchaseItems, //판매자
            cardNo: cardNo,  //cardInfo 받아올때 card_no를 풀로 받아와야 할 듯 => ai일때와 선택카드일 때 잘 변경해서 넣어줘야 하는데 어떻게 해야할까
            cardCode: recommendData.recommendCard,  //cardInfo에서
            getIsAi: getIsAi, //이전 구매자 QR 생성부터 들고 와야 함
            payDate: purchaseData.payDate, //판매자 쪽에서
            saveType: saveType,  //여기서 AI 결과 값에 따라 자바스트립트로 처리 해야 할 듯
            savePrice: recommendData.maximumBenefits, //AI 정보
            franchiseName: purchaseData.franchiseName, //판매자
            franchiseCode: purchaseData.franchiseCode, //판매자
            memberNo: memberNo, 
        };

        try {
            const response = await axios.post(
                'http://localhost:8091/api/payment/request',
                paymentData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );
            const paymentStatus = response.data; // API가 반환하는 return 값(결제 상태)

            console.log(paymentStatus);

            const orderNo = paymentData.orderNo;

            if (paymentStatus === 0) {
                // 결제 성공
                alert('결제가 완료되었습니다.');
                setPaymentSuccess(true);
                // setPaymentData(response.data);
                navigate(`/pay/receipt?orderNo=${orderNo}`);
                //결제 요청 값? 데이터 그대로 보내줘? 아님 쿼리파라미터로 달아서 페이지 이동? -> receipt에서는 파라미터 값 가져와서 API 호출?
            } else if (paymentStatus === 1) {
                // 카드 불일치
                alert('결제 실패: 카드 정보 불일치');
            } else if (paymentStatus === 2) {
                // 유효기간 만료
                alert('결제 실패:  유효기간 만료');
            } else if (paymentStatus === 3) {
                // 한도 초과
                alert('결제 실패: 카드 한도 초과');
            } else {
                // 예외 에러
                alert('결제 실패: 서버 에러 발생');
            }
        } catch (error) {
            console.log('에러');
        }
    };

    //해당 멤버로 카드 리스트 가져오기(여기서 불러와야 함;;)
    const handleShowCardPicker = async () => {
        try {
            const response = await axios.get('http://localhost:8091/api/cards/details/byMember', { params: { memberNo } });
            setCards(response.data);
            setShowCardPicker(true);
        } catch (error) {
            console.error('카드 리스트를 가져오는 데 실패했습니다.', error);
        }
    };

    // //카드 코드 가져와서 전환 -> 카드 코드 있으니 isAi는 false로 선택한 카드
    // const handleCardSelection = (selectedCardCode) => {
    //     console.log(selectedCardCode);
    //     setCardCode(selectedCard.cardCode);
    //     setShowCardPicker(false); // CardPicker 닫기
    // };

    useEffect(()=> {
        
        setCardCode(selectedCard.cardCode);
    },[selectedCard])
    
    return (
        <div>
            <Header />
            <Order getCardInfo={cardInfo} getBenefit={getBenefit} getPurchase={getPurchase} getIsAi={getIsAi}/>

            <div className="d-flex justify-content-center">
                <div className="col-10 row">
                    {getIsAi && (
                        <div className="p-2 px-4 aiInfo">
                            <p>{recommendData.detailExplanation}</p>
                        </div>
                    )}
                    <Button
                        onClick={handlePayment}
                        text={'이 카드로 결제하기'}
                    />

                    <p
                        className="text-decoration-underline text-end mt-2 p-0"
                        onClick={handleShowCardPicker} 
                    >
                        다른 카드 선택하기
                    </p>

                </div>
            </div>
            {showCardPicker && (
                <CardPicker
                    onRemove={() => setShowCardPicker(false)}
                    cards={cards}
                />
            )}

            {!getIsAi && <RecoCard recommendData={recommendData} setCardCode={setCardCode} />}
        </div>
    );
};

export default Pay;
