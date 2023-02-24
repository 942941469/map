'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription(str) {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${str[0].toUpperCase()}${str.slice(1)} on 
    ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  // 坐标 距离 时间 每分钟步数
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription('running');
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  // 坐标 距离 时间 海拔
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.caleSpeed();
    this._setDescription('cycling');
  }

  caleSpeed() {
    this.speed = this.duration / (this.distance / 60);
    return this.speed;
  }
}

class App {
  // 地图
  #map;
  // 点击坐标
  #mapEvent;
  // 卡片
  #workouts = [];
  // 地图参数
  #mapZoomLevel = 13;

  constructor() {
    this._getPosition();
    // 获取本地数据
    this._getLocalStorage();
    // 表单提交 this重新指回app
    form.addEventListener('submit', this._newWorkout.bind(this));
    // 切换标签
    inputType.addEventListener('change', this._toggleElevationField);
    // 点击标签切换地点
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // 调用谷歌地图API获取坐标
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('error');
        }
      );
    }
  }

  // 把坐标传入显示
  _loadMap(position) {
    // 获取坐标
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    // 点击地图获取坐标
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkout(work, work.type);
      this._renderWorkoutMarker(work, work.type);
    });
  }

  // 显示表单
  _showForm(mapE) {
    // 将坐标数组赋予全局变量
    this.#mapEvent = mapE;
    // 显示表格
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // 清空表单
    form.reset();
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // 切换标签
  _toggleElevationField() {
    // 找最近的父元素,查看是否隐藏
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // 表单提交
  _newWorkout(e) {
    // 判断是否为数字
    const validInputs = (...inputs) =>
      inputs.every(item => Number.isFinite(item));
    // 判断是否为正数
    const allPositive = (...inputs) => inputs.every(item => item > 0);
    // 取消表单默认行为
    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        alert('必须输入正确的数字');
      workout = new Running([lat, lng], distance, duration, cadence);
    } else {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        alert('必须输入正确的数字');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);
    // 隐藏表格
    this._hideForm();
    // 标记地图
    this._renderWorkoutMarker(workout, type);
    // 显示表格数据
    this._renderWorkout(workout, type);
    // 本地存储数据
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout, type) {
    L.marker(workout.coords)
      .addTo(this.#map)
      // 弹出窗口设置
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${type}-popup`,
        })
      )
      // 设置文本
      .setPopupContent(
        `${type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout, type) {
    let html = `
      <li class='workout workout--${type}' data-id='${workout.id}'>
        <h2 class='workout__title'>${workout.description}</h2>
        <div class='workout__details'>
          <span class='workout__icon'>${type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class='workout__value'>${workout.distance}</span>
          <span class='workout__unit'>km</span>
        </div>
        <div class='workout__details'>
          <span class='workout__icon'>⏱</span>
          <span class='workout__value'>${workout.duration}</span>
          <span class='workout__unit'>min</span>
        </div>
    `;
    if (type === 'running') {
      html += `
          <div class='workout__details'>
          <span class='workout__icon'>⚡️</span>
          <span class='workout__value'>${workout.pace.toFixed(1)}</span>
          <span class='workout__unit'>min/km</span>
        </div>
        <div class='workout__details'>
          <span class='workout__icon'>🦶🏼</span>
          <span class='workout__value'>${workout.cadence}</span>
          <span class='workout__unit'>spm</span>
        </div>
      </li>
      `;
    } else {
      html += `
          <div class='workout__details'>
          <span class='workout__icon'>⚡️</span>
          <span class='workout__value'>${workout.speed.toFixed(1)}</span>
          <span class='workout__unit'>km/h</span>
        </div>
        <div class='workout__details'>
          <span class='workout__icon'>⛰</span>
          <span class='workout__value'>${workout.elevationGain}</span>
          <span class='workout__unit'>m</span>
        </div>
      </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  // 点击标签移动到相应地点
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // 本地存储
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // 获得本地存储
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
  }
}

const app = new App();
