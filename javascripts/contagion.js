/*
  CONTAGION
  
  A simulation of infectious disease spread
  
  Version: 1.0
  Author:  Dave Rosborough (david at rosborough dot ca)
  Date:    June 15, 2011
  Copyright: 2011 Rosborough Tech Co.  
    
    This file is part of Contagion.

    Contagion is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Contagion is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Contagion.  If not, see <http://www.gnu.org/licenses/>.

*/

// TODO: statistical display
// TODO: hide or show parameters (so that kids can "discover" and "build" the simulation)
// TODO: documentation
// TODO: licensing


var grid_width = 15;
var grid_height = 10;
var population_size = 20;
var starting_infected = 1;        // how many you infected people start with 
var contagiousness = 0.8;         // the probability that someone "in range" will be infected on a given turn
var contagion_distance = 1;       // anyone inside this many squares around the infected person could be infected
var contagion_period = 8;       // after this long, they simply won't infect people any more.
var probability_of_death = 0.5;   // used to determine whether they recover or die
var mean_seconds_to_fate = 10;   // how long it takes (on average) until their fate happens
var st_dev_to_fate = 2;           // makes the actual time to fate a nice normal distribution... sweet, eh?
var allow_immunity = 1;           // if they survive, they'll be immune and can't catch it again.
var seconds_between_moves = 1;    // if this is higher than 1, it just allows people a chance to die / heal between moves
var max_simulation_seconds = 10000;  // total number of "turns" in the sim
var current_seconds = 0;
var timer;

function random_standard_normal() {
	return (Math.random()*2-1)+(Math.random()*2-1)+(Math.random()*2-1);
}

function random_normal(mean, stdev) {
	return Math.round(random_standard_normal()*stdev+mean);
}

function Person () {
  this.status = 0;     // 0 = healthy, 1 = infected, 2 = dead, 3 = immune
  this.infected_seconds = 0;
  this.fate = 0;
  this.time_to_fate = mean_seconds_to_fate;
  this.moved_this_turn = 0;
}

Person.prototype.infect = function () {
  this.status = 1;
  if (Math.random() > probability_of_death) {
    allow_immunity ? this.fate = 3 : this.fate = 0;
  } else {
    this.fate = 2;
  }
  this.time_to_fate = random_normal(mean_seconds_to_fate, st_dev_to_fate);
  this.infected_seconds = 0;
}

Person.prototype.inflict_fate = function() {
  this.status = this.fate;
  this.fate = 0;
  this.time_to_fate = mean_seconds_to_fate;
  this.infected_seconds = 0;
}

function Grid () {
  this.grid = new Array(grid_height);
  for (i = 0; i < grid_height; i++) {
    this.grid[i] = new Array(grid_width);
    for (j = 0; j < grid_width; j++) {
      this.grid[i][j] = -1;
    }
  }
  this.people = new Array(population_size);
}

Grid.prototype.print_grid = function() {
  grid_str = "<br />";
  for (row = 0; row < grid_height; row++) {
    for (col = 0; col < grid_width; col++) {
      if (this.grid[row][col] == -1) {
        grid_str += "<img src='images/empty.gif' />";
      } else {
        switch (this.people[this.grid[row][col]].status) {
          case 1:
            grid_str += "<img src='images/sick.gif' />";
            break;
          case 2:
            grid_str += "<img src='images/dead.gif' />";
            break;
          case 3:
            grid_str += "<img src='images/immune.gif' />";
            break;
          default:
            grid_str += "<img src='images/healthy.gif' />";    
        } // switch
      }   // else
    }
    grid_str += "<br />";
  }
  return grid_str;
}

Grid.prototype.populate_grid = function() {
  for (i = 0; i < population_size; i++) {
    p = new Person();
    if (i < starting_infected) {
      p.infect();
    }
    x = -1;
    while ((x == -1) || (this.grid[y][x] != -1)) {
      x = Math.floor(Math.random()*grid_width);
      y = Math.floor(Math.random()*grid_height);
    }
    this.people[i] = p;
    this.grid[y][x] = i;
  }
}

Grid.prototype.move_people = function() {
  for (row = 0; row < grid_height; row++) {
    for (col = 0; col < grid_width; col++) {
      if (this.grid[row][col] != -1) {  // there's a person here
        p = this.people[this.grid[row][col]];
        
        if (p.moved_this_turn || (p.status == 2)) continue;
        
        legal_moves_mask = 15;  // 1111, for Up Rt Dn Lt
        if ((row == 0) || (this.grid[row-1][col] != -1)) {  // up won't work
          legal_moves_mask &= 7;
        }
        if ((row == grid_height - 1) || (this.grid[row+1][col] != -1)) {  // down won't work
          legal_moves_mask &= 13;
        }
        if ((col == 0) || (this.grid[row][col-1] != -1)) {  // left won't work
          legal_moves_mask &= 14;
        }
        if ((col == grid_width - 1) || (this.grid[row][col+1] != -1)) { // right won't work
          legal_moves_mask &= 11;
        }
        
        move = "";
        // need to pick a random move from the available ones... yikes... wish I'd thought of that when I chose to mask...
        if (legal_moves_mask > 0) {
          moves_str = "";
          if (legal_moves_mask & 8) moves_str += "U";
          if (legal_moves_mask & 4) moves_str += "R";
          if (legal_moves_mask & 2) moves_str += "D";
          if (legal_moves_mask & 1) moves_str += "L";
          choice = Math.floor(Math.random()*moves_str.length);
          move = moves_str.substr(choice, 1);
        }
        
        p.moved_this_turn = 1;
        
        switch(move) {
          case "U":
            this.grid[row-1][col] = this.grid[row][col];
            this.grid[row][col] = -1;
            break;
          case "R":
            this.grid[row][col+1] = this.grid[row][col];
            this.grid[row][col] = -1;
            break;
          case "D":
            this.grid[row+1][col] = this.grid[row][col];
            this.grid[row][col] = -1;
            break;
          case "L":
            this.grid[row][col-1] = this.grid[row][col];
            this.grid[row][col] = -1;
            break;
          default:
        }
      }
    }
  }
  for (row = 0; row < grid_height; row++) {
    for (col = 0; col < grid_width; col++) {
      if (this.grid[row][col] != -1) {  // there's a person here
        this.people[this.grid[row][col]].moved_this_turn = 0;
      }
    }
  }
}

Grid.prototype.infect_people = function() {
  for (row = 0; row < grid_height; row++) {
    for (col = 0; col < grid_width; col++) {
      if (this.grid[row][col] != -1) {  // there's a person here
        p = this.people[this.grid[row][col]];
        
        // freshly infected or out-of-contagious-period people won't cause infections.
        if ((p.moved_this_turn) || (p.infected_seconds > contagion_period)) continue;
        
        if (p.status == 1) {  // infectious!
          minX = col - contagion_distance;
          minY = row - contagion_distance;
          maxX = col + contagion_distance;
          maxY = row + contagion_distance;
          
          // correct for out-of-bounds conditions
          if (minX < 0) minX = 0;
          if (minY < 0) minY = 0;
          if (maxX > grid_width - 1) maxX = grid_width - 1;
          if (maxY > grid_height - 1) maxY = grid_height - 1;
          
          for (y = minY; y <= maxY; y++) {
            for (x = minX; x <= maxX; x++) {
              if ((x == col) && (y == row)) continue;
              
              if (this.grid[y][x] != -1) {
                victim = this.people[this.grid[y][x]];
                if (victim.status == 0) {
                  if (Math.random() <= contagiousness) {
                    victim.moved_this_turn = 1;
                    victim.infect();
                  } // if
                } // if 
              } // if
            } // for x
          } // for y
        } // if (p.status == 1)
      } // if this.grid
    } // for col
  } // for row
  for (row = 0; row < grid_height; row++) {
    for (col = 0; col < grid_width; col++) {
      if (this.grid[row][col] != -1) {  // there's a person here
        this.people[this.grid[row][col]].moved_this_turn = 0;
      }
    }
  }
}

Grid.prototype.increment_time = function() {
  for (row = 0; row < grid_height; row++) {
    for (col = 0; col < grid_width; col++) {
      if (this.grid[row][col] != -1) {
        p = this.people[this.grid[row][col]];
        if (p.status == 1) {
          p.infected_seconds += 1;
          if (p.infected_seconds > p.time_to_fate) {
            p.inflict_fate();
          }
        }
      }
    }
  }
}

Grid.prototype.is_complete = function() {
  complete = 1;
  for (row = 0; row < grid_height; row++) {
    for (col = 0; col < grid_width; col++) {
      if (this.grid[row][col] != -1) {
        p = this.people[this.grid[row][col]];
        if (p.status == 1) {
          complete = 0;
        }
      }
      if (!complete) return complete;
    }
  }
  return complete;
}

var g = new Grid;

function start_sim() {
  self.clearInterval(timer);
  if (!validate_form()) return;
  
  load_form_values();
  g = new Grid;
  current_seconds = 0;
  g.populate_grid();
  document.getElementById("board").innerHTML = g.print_grid();
  timer = self.setInterval("iterate_sim()", 1000);
}

function iterate_sim() {
  current_seconds += 1;
  if ((current_seconds >= max_simulation_seconds) || (g.is_complete())) {
    self.clearInterval(timer);
  }
  g.increment_time();
  if (current_seconds % seconds_between_moves == 0) {
    g.infect_people();
    g.move_people();
  }
  document.getElementById("board").innerHTML = g.print_grid();

}

function populate_form() {
  document.getElementById("grid_width").value = grid_width;
  document.getElementById("grid_height").value = grid_height;
  document.getElementById("population_size").value = population_size;
  document.getElementById("starting_infected").value = starting_infected;
  document.getElementById("contagiousness").value = contagiousness;
  document.getElementById("contagion_distance").value = contagion_distance;
  document.getElementById("contagion_period").value = contagion_period;
  document.getElementById("probability_of_death").value = probability_of_death;
  document.getElementById("mean_seconds_to_fate").value = mean_seconds_to_fate;
  document.getElementById("st_dev_to_fate").value = st_dev_to_fate;
  document.getElementById("allow_immunity").value = allow_immunity;
  document.getElementById("seconds_between_moves").value = seconds_between_moves;  
  
  g = new Grid();
  document.getElementById("board").innerHTML = g.print_grid();
}

function validate_form() {
  validation_msg = "";
  i = parseInt(document.getElementById("grid_width").value);
  if (!((i >= 1) && (i <= 50))) validation_msg += ("Width must be between 1 and 50\n");
  
  i = parseInt(document.getElementById("grid_height").value);
  if (!((i >= 1) && (i <= 50))) validation_msg += ("Height must be between 1 and 50\n");
  
  i = parseInt(document.getElementById("population_size").value);
  if (!((i >= 1) && (i <= 100))) validation_msg += ("Population must be between 1 and 100\n");
  
  j = parseInt(document.getElementById("starting_infected").value);
  if (!((j >= 1) && (j < i))) validation_msg += ("Number of infected must be between 1 and the population size\n");
  
  i = parseFloat(document.getElementById("contagiousness").value);
  if (!((i >= 0) && (i <= 1))) validation_msg += ("Contagiousness must be a probability between 0 and 1\n");
  
  i = parseInt(document.getElementById("contagion_distance").value);
  if (!((i >= 1) && (i <= 10))) validation_msg += ("Contagion Distance must be between 1 and 10\n");
  
  i = parseInt(document.getElementById("contagion_period").value);
  if (!(i >= 1)) validation_msg += ("Contagion Period must be between at least 1\n");
  
  i = parseFloat(document.getElementById("probability_of_death").value);
  if (!((i >= 0) && (i <= 1))) validation_msg += ("Lethality must be a probability between 0 and 1\n");
  
  i = parseFloat(document.getElementById("mean_seconds_to_fate").value);
  if (!((i >= 1) && (i <= 50))) validation_msg += ("Mean Time to Death or Recovery must be between 1 and 50\n");
  
  i = parseFloat(document.getElementById("st_dev_to_fate").value);
  if (!((i >= 0) && (i <= 10))) validation_msg += ("St Dev to Death or Recovery must be between 1 and 10\n");
  
  i = parseInt(document.getElementById("allow_immunity").value);
  if (!((i == 0) || (i == 1))) validation_msg += ("Recoveries Become Immune must be either 0 (false) or 1 (true)\n");
  
  i = parseInt(document.getElementById("seconds_between_moves").value);
  if (!((i >= 1) || (i <= 10))) validation_msg += ("Seconds per Move must be between 1 and 10\n");
  
  
  if (validation_msg != "") {
    alert(validation_msg);
    return false;
  }
  return true;
}

function load_form_values() {
  grid_width = parseInt(document.getElementById("grid_width").value);
  grid_height = parseInt(document.getElementById("grid_height").value);
  population_size = parseInt(document.getElementById("population_size").value);
  starting_infected = parseInt(document.getElementById("starting_infected").value);
  contagiousness = parseFloat(document.getElementById("contagiousness").value);
  contagion_distance = parseInt(document.getElementById("contagion_distance").value);
  contagion_period = parseInt(document.getElementById("contagion_period").value);
  probability_of_death = parseFloat(document.getElementById("probability_of_death").value);
  mean_seconds_to_fate = parseFloat(document.getElementById("mean_seconds_to_fate").value);
  st_dev_to_fate = parseFloat(document.getElementById("st_dev_to_fate").value);
  allow_immunity = parseInt(document.getElementById("allow_immunity").value);
  seconds_between_moves = parseInt(document.getElementById("seconds_between_moves").value);  
}