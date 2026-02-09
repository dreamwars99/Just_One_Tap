using UnityEngine;

namespace J_O_T.Core
{
    /// <summary>
    /// 핵심 루틴(One Tap) 및 스트릭(Streak) 로직을 처리하는 매니저
    /// </summary>
    public class RoutineManager : MonoBehaviour
    {
        private static RoutineManager _instance;
        public static RoutineManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    GameObject go = new GameObject("RoutineManager");
                    _instance = go.AddComponent<RoutineManager>();
                }
                return _instance;
            }
        }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
        }

        /// <summary>
        /// 오늘 루틴이 완료되었는지 확인합니다.
        /// </summary>
        /// <returns>오늘 완료 여부</returns>
        public bool IsTodayDone()
        {
            // TODO: 오늘 완료 여부 체크 로직 구현
            return false;
        }

        /// <summary>
        /// 루틴 액션을 시도합니다.
        /// </summary>
        public void TryRoutineAction()
        {
            // TODO: 루틴 액션 로직 구현
        }
    }
}